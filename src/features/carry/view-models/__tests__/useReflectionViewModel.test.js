const React = require('react');
const { afterEach, describe, expect, it, jest } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../../../bible/test-utils/hookTestHelpers');
const { useReflectionViewModel } = require('../useReflectionViewModel');

const { act } = React;
const NOW = new Date('2026-10-05T12:00:00.000Z');
const ok = (value) => ({ ok: true, value });

function carry(id = 'carry-1', overrides = {}) {
  return {
    id,
    categoryId: 'work',
    situation: 'Before a hard conversation',
    scheduledAt: new Date('2026-10-04T12:00:00.000Z'),
    passage: { startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.20' },
    ifThenIntention: 'If I feel tense, then I will listen first.',
    reminderId: 'reminder-1',
    createdAt: new Date('2026-10-02T01:00:00.000Z'),
    ...overrides,
  };
}

function makeRepository(overrides = {}) {
  const repository = {
    findById: jest.fn(async (id) => ok(carry(id))),
    recordReflection: jest.fn(async (id, reflection) => ok({ ...carry(id), reflection })),
    ...overrides,
  };
  return repository;
}

function makeOptions(overrides = {}) {
  return {
    carryRepository: makeRepository(),
    carryId: 'carry-1',
    createId: jest.fn(() => 'reflection-1'),
    now: jest.fn(() => new Date(NOW.getTime())),
    ...overrides,
  };
}

async function mount(options = makeOptions()) {
  let currentOptions = options;
  let viewModel;

  function Probe() {
    viewModel = useReflectionViewModel(currentOptions);
    return null;
  }

  const renderer = await mountProbe(Probe);
  return {
    current: () => viewModel,
    update: async (updates) => {
      currentOptions = { ...currentOptions, ...updates };
      await act(async () => renderer.update(React.createElement(Probe)));
    },
    renderer,
  };
}

let renderer;

afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
});

describe('useReflectionViewModel', () => {
  it('retries a failed load without resetting the local reflection draft', async () => {
    const carryRepository = makeRepository({
      findById: jest
        .fn()
        .mockResolvedValueOnce(ok(carry()))
        .mockResolvedValueOnce({ ok: false, code: 'unavailable' })
        .mockResolvedValueOnce(ok(carry())),
    });
    const mounted = await mount(makeOptions({ carryRepository }));
    renderer = mounted.renderer;
    const { current } = mounted;

    expect(current().loadState).toBe('ready');
    expect(current().draft).toEqual({ alignmentRating: null, whatOccurred: '', insight: '' });
    expect(current().carry.situation).toBe('Before a hard conversation');

    await act(async () => {
      current().onChangeWhatOccurred('I paused before answering.');
      current().onChangeInsight('Listening first helped.');
    });
    await act(async () => current().retry());
    expect(current().loadState).toBe('error');
    expect(current().draft).toEqual({
      alignmentRating: null,
      whatOccurred: 'I paused before answering.',
      insight: 'Listening first helped.',
    });

    await act(async () => current().retry());
    expect(current().loadState).toBe('ready');
    expect(current().draft.whatOccurred).toBe('I paused before answering.');
    expect(carryRepository.findById).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['missing', { ok: true, value: null }, 'not_found'],
    [
      'upcoming',
      ok(carry('carry-1', { scheduledAt: new Date('2026-10-06T12:00:00.000Z') })),
      'not_ready',
    ],
    [
      'already reflected',
      ok(
        carry('carry-1', {
          reflection: {
            id: 'reflection-old',
            alignmentRating: 4,
            whatOccurred: 'I paused.',
            insight: 'That helped.',
            createdAt: new Date('2026-10-05T11:00:00.000Z'),
          },
        }),
      ),
      'already_reflected',
    ],
  ])('gates the form when the stored Carry is %s', async (_label, result, expectedState) => {
    const carryRepository = makeRepository({ findById: jest.fn(async () => result) });
    const mounted = await mount(makeOptions({ carryRepository }));
    renderer = mounted.renderer;

    expect(mounted.current().loadState).toBe(expectedState);
    expect(mounted.current().savedCarry).toBeNull();
    await act(async () => mounted.current().save());
    expect(carryRepository.recordReflection).not.toHaveBeenCalled();
  });

  it('maps null-rating feedback and avoids writing an invalid draft', async () => {
    const carryRepository = makeRepository();
    const mounted = await mount(makeOptions({ carryRepository }));
    renderer = mounted.renderer;

    await act(async () => {
      mounted.current().onChangeWhatOccurred('I paused.');
      mounted.current().onChangeInsight('That helped.');
    });
    await act(async () => mounted.current().save());

    expect(mounted.current().fieldErrors).toEqual({
      alignmentRating: 'Choose an alignment rating.',
    });
    expect(carryRepository.recordReflection).not.toHaveBeenCalled();
  });

  it('locks duplicate saves, retains failed drafts, and allows a later retry', async () => {
    let resolveWrite;
    const pendingWrite = new Promise((resolve) => {
      resolveWrite = resolve;
    });
    const carryRepository = makeRepository({
      recordReflection: jest
        .fn()
        .mockReturnValueOnce(pendingWrite)
        .mockImplementation(async (id, reflection) => ok({ ...carry(id), reflection })),
    });
    const mounted = await mount(makeOptions({ carryRepository }));
    renderer = mounted.renderer;
    const { current } = mounted;

    await act(async () => {
      current().onChangeRating(5);
      current().onChangeWhatOccurred('I paused.');
      current().onChangeInsight('That helped.');
    });

    let firstSave;
    let duplicateSave;
    await act(async () => {
      firstSave = current().save();
      duplicateSave = current().save();
    });
    expect(current().isSaving).toBe(true);
    expect(carryRepository.recordReflection).toHaveBeenCalledTimes(1);

    await act(async () => current().onChangeInsight('This change is blocked.'));
    expect(current().draft.insight).toBe('That helped.');
    await act(async () => {
      resolveWrite({ ok: false, code: 'unavailable' });
      await Promise.all([firstSave, duplicateSave]);
    });
    expect(current().isSaving).toBe(false);
    expect(current().saveError).toBe('Your reflection could not be saved. Please try again.');
    expect(current().draft).toEqual({
      alignmentRating: 5,
      whatOccurred: 'I paused.',
      insight: 'That helped.',
    });

    await act(async () => current().save());
    expect(current().savedCarry.reflection).toEqual({
      id: 'reflection-1',
      alignmentRating: 5,
      whatOccurred: 'I paused.',
      insight: 'That helped.',
      createdAt: NOW,
    });
    expect(carryRepository.recordReflection).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale read and save after the carry ID changes', async () => {
    let resolveOldRead;
    const oldRead = new Promise((resolve) => {
      resolveOldRead = resolve;
    });
    let resolveOldWrite;
    const oldWrite = new Promise((resolve) => {
      resolveOldWrite = resolve;
    });
    const carryRepository = makeRepository({
      findById: jest.fn((id) => (id === 'carry-1' ? oldRead : Promise.resolve(ok(carry(id))))),
      recordReflection: jest.fn(() => oldWrite),
    });
    const mounted = await mount(makeOptions({ carryRepository }));
    renderer = mounted.renderer;

    await mounted.update({ carryId: 'carry-2' });
    expect(mounted.current().loadState).toBe('ready');
    await act(async () => {
      mounted.current().onChangeRating(4);
      mounted.current().onChangeWhatOccurred('Carry two reflection.');
      mounted.current().onChangeInsight('Carry two insight.');
    });
    let oldSave;
    await act(async () => {
      oldSave = mounted.current().save();
    });
    expect(carryRepository.recordReflection).toHaveBeenCalledTimes(1);

    await mounted.update({ carryId: 'carry-3' });
    await act(async () => mounted.current().onChangeWhatOccurred('Carry three draft.'));
    await act(async () => {
      resolveOldRead(ok(carry('carry-1')));
      resolveOldWrite({ ok: true, value: { ...carry('carry-2'), reflection: {} } });
      await oldSave;
      await oldRead;
      await oldWrite;
    });

    expect(mounted.current().loadState).toBe('ready');
    expect(mounted.current().carry.id).toBe('carry-3');
    expect(mounted.current().draft.whatOccurred).toBe('Carry three draft.');
    expect(mounted.current().savedCarry).toBeNull();
  });

  it('ignores a pending save after unmount', async () => {
    let resolveWrite;
    const pendingWrite = new Promise((resolve) => {
      resolveWrite = resolve;
    });
    const carryRepository = makeRepository({ recordReflection: jest.fn(() => pendingWrite) });
    const mounted = await mount(makeOptions({ carryRepository }));
    renderer = mounted.renderer;

    await act(async () => {
      mounted.current().onChangeRating(4);
      mounted.current().onChangeWhatOccurred('I paused.');
      mounted.current().onChangeInsight('That helped.');
    });
    let pendingSave;
    const staleSave = mounted.current().save;
    await act(async () => {
      pendingSave = mounted.current().save();
    });
    await unmountProbe(renderer);
    renderer = undefined;
    await act(async () => staleSave());
    expect(carryRepository.recordReflection).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveWrite({ ok: true, value: { ...carry(), reflection: {} } });
      await pendingSave;
      await pendingWrite;
    });
  });
});
