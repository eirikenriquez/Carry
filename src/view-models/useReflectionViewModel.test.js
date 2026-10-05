const React = require('react');
const { afterEach, describe, expect, it, jest } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');
const { useReflectionViewModel } = require('./useReflectionViewModel');

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
  let viewModel;

  function Probe() {
    viewModel = useReflectionViewModel(options);
    return null;
  }

  const renderer = await mountProbe(Probe);
  return {
    current: () => viewModel,
    renderer,
  };
}

let renderer;

afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
});

describe('useReflectionViewModel', () => {
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
});
