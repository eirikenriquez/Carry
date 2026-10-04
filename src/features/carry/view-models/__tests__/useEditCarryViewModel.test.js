const React = require('react');
const { afterEach, describe, expect, it, jest } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../../../bible/test-utils/hookTestHelpers');
const { useEditCarryViewModel } = require('../useEditCarryViewModel');

const { act } = React;
const INITIAL_SELECTION = { startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.19' };
const NEXT_SELECTION = { startVerseKey: 'JAS.1.20', endVerseKey: 'JAS.1.20' };
const NOW = new Date('2026-10-02T00:00:00.000Z');
const FUTURE_DATE = new Date('2026-10-03T12:00:00.000Z');
const category = { id: 'work', name: 'Work' };

let renderer;

function carry(overrides = {}) {
  return {
    id: 'carry-1',
    categoryId: category.id,
    situation: 'Before a hard conversation',
    scheduledAt: FUTURE_DATE,
    passage: INITIAL_SELECTION,
    ifThenIntention: 'If I feel tense, then I will listen first.',
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    ...overrides,
  };
}

function passage(selection, reference = 'James 1:19') {
  const [bookId, chapter, verse] = selection.startVerseKey.split('.');
  return {
    reference,
    verses: [
      {
        key: selection.startVerseKey,
        bookId,
        chapter: Number(chapter),
        verse: Number(verse),
        text: `${reference} text.`,
      },
    ],
  };
}

function makeOptions(overrides = {}) {
  const bibleRepository = overrides.bibleRepository ?? {
    getPassage: jest.fn(async (selection) => ({ ok: true, value: passage(selection) })),
  };
  const carryRepository = overrides.carryRepository ?? {
    findById: jest.fn(async () => ({ ok: true, value: carry() })),
    getCategories: jest.fn(async () => ({ ok: true, value: [category] })),
    update: jest.fn(async (_nextCategory, nextCarry) => ({ ok: true, value: nextCarry })),
  };

  return {
    bibleRepository,
    carryRepository,
    notifications: {
      requestPermission: jest.fn(async () => true),
      schedule: jest.fn(async () => 'reminder-1'),
      cancel: jest.fn(async () => undefined),
    },
    carryId: 'carry-1',
    createId: jest.fn(() => 'candidate-category-id'),
    now: jest.fn(() => NOW),
    ...overrides,
  };
}

async function mount(options = makeOptions()) {
  let currentOptions = options;
  let viewModel;

  function Probe() {
    viewModel = useEditCarryViewModel(currentOptions);
    return null;
  }

  renderer = await mountProbe(Probe);
  return {
    current: () => viewModel,
    update: async (updates) => {
      currentOptions = { ...currentOptions, ...updates };
      await act(async () => renderer.update(React.createElement(Probe)));
    },
  };
}

afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
});

describe('useEditCarryViewModel', () => {
  it('blocks prefill when categories fail, then retries without resetting the ready draft', async () => {
    const carryRepository = {
      findById: jest.fn(async () => ({ ok: true, value: carry() })),
      getCategories: jest
        .fn()
        .mockResolvedValueOnce({ ok: false, code: 'unavailable' })
        .mockResolvedValue({ ok: true, value: [category] }),
      update: jest.fn(async (_nextCategory, nextCarry) => ({ ok: true, value: nextCarry })),
    };
    const options = makeOptions({ carryRepository });
    const { current } = await mount(options);

    expect(current().loadState).toBe('error');
    expect(current().draft).toBeNull();
    expect(current().categoryLoadFailed).toBe(true);

    await act(async () => current().retry());
    expect(current().loadState).toBe('ready');
    expect(current().draft.categoryName).toBe('Work');

    await act(async () => current().onChangeSituation('A changed draft'));
    await act(async () => current().onRetryCategories());

    expect(current().draft.situation).toBe('A changed draft');
    expect(current().categories).toEqual([category]);
    expect(carryRepository.getCategories).toHaveBeenCalledTimes(3);
  });

  it('applies picker results without replacing other fields and ignores an older preview', async () => {
    let resolveOldPreview;
    const oldPreview = new Promise((resolve) => {
      resolveOldPreview = resolve;
    });
    const bibleRepository = {
      getPassage: jest
        .fn()
        .mockReturnValueOnce(oldPreview)
        .mockResolvedValue({ ok: true, value: passage(NEXT_SELECTION, 'James 1:20') }),
    };
    const { current, update } = await mount(makeOptions({ bibleRepository }));

    expect(current().loadState).toBe('ready');
    expect(current().passagePreview).toEqual({ status: 'loading' });
    await act(async () => current().onChangeSituation('Keep this edited situation'));
    await update({ selection: NEXT_SELECTION });

    expect(current().draft).toEqual({
      ...current().draft,
      situation: 'Keep this edited situation',
      passage: NEXT_SELECTION,
    });
    expect(current().passagePreview).toEqual({
      status: 'ready',
      data: passage(NEXT_SELECTION, 'James 1:20'),
    });

    await act(async () => {
      resolveOldPreview({ ok: true, value: passage(INITIAL_SELECTION, 'James 1:19') });
      await oldPreview;
    });
    expect(current().passagePreview.data.reference).toBe('James 1:20');
  });

  it.each([
    ['missing records', { ok: true, value: null }, 'not_found'],
    [
      'records that are no longer upcoming',
      { ok: true, value: carry({ scheduledAt: new Date(NOW.getTime()) }) },
      'not_upcoming',
    ],
  ])('reports %s without exposing a draft', async (_label, findResult, expectedState) => {
    const carryRepository = {
      findById: jest.fn(async () => findResult),
      getCategories: jest.fn(async () => ({ ok: true, value: [category] })),
      update: jest.fn(),
    };
    const { current } = await mount(makeOptions({ carryRepository }));

    expect(current().loadState).toBe(expectedState);
    expect(current().draft).toBeNull();
  });

  it('maps validation, prevents duplicate updates, and locks the draft after a successful save', async () => {
    let resolveUpdate;
    const carryRepository = {
      findById: jest.fn(async () => ({ ok: true, value: carry() })),
      getCategories: jest.fn(async () => ({ ok: true, value: [category] })),
      update: jest.fn(
        (_nextCategory, nextCarry) =>
          new Promise((resolve) => {
            resolveUpdate = () => resolve({ ok: true, value: nextCarry });
          }),
      ),
    };
    const options = makeOptions({ carryRepository });
    const { current } = await mount(options);

    await act(async () => current().onChangeCategory(''));
    await act(async () => current().onChangeSchedule(new Date(Number.NaN)));
    await act(async () => current().save());
    expect(current().errors.categoryName).toBe('Choose or enter a category.');
    expect(current().errors.scheduledAt).toBe('Choose a valid schedule date.');
    expect(carryRepository.update).not.toHaveBeenCalled();

    await act(async () => {
      current().onChangeCategory('Work');
      current().onChangeSchedule(FUTURE_DATE);
    });

    let firstSave;
    let duplicateSave;
    await act(async () => {
      firstSave = current().save();
      duplicateSave = current().save();
    });
    expect(carryRepository.update).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate();
      await Promise.all([firstSave, duplicateSave]);
    });
    expect(current().savedCarry.id).toBe('carry-1');
    expect(carryRepository.update.mock.calls[0][0]).toEqual({
      id: 'candidate-category-id',
      name: 'Work',
    });

    await act(async () => {
      current().onChangeSituation('A post-save edit');
      await current().save();
    });
    expect(current().draft.situation).toBe('Before a hard conversation');
    expect(carryRepository.update).toHaveBeenCalledTimes(1);
  });

  it('keeps the saved edit locked while its reminder sync is pending', async () => {
    let resolveSchedule;
    const notifications = {
      requestPermission: jest.fn(async () => true),
      schedule: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveSchedule = () => resolve('reminder-2');
          }),
      ),
      cancel: jest.fn(async () => undefined),
    };
    const carryRepository = {
      findById: jest.fn(async () => ({ ok: true, value: carry() })),
      getCategories: jest.fn(async () => ({ ok: true, value: [category] })),
      update: jest.fn(async (_nextCategory, nextCarry) => ({ ok: true, value: nextCarry })),
      setReminderId: jest.fn(async () => ({ ok: true, value: true })),
    };
    const { current } = await mount(makeOptions({ carryRepository, notifications }));

    let save;
    await act(async () => {
      save = current().save();
    });
    expect(carryRepository.update).toHaveBeenCalledTimes(1);
    expect(current().isSaving).toBe(true);
    await act(async () => {
      current().onChangeSituation('A duplicate edit');
      await current().save();
    });
    expect(carryRepository.update).toHaveBeenCalledTimes(1);
    expect(current().draft.situation).toBe('Before a hard conversation');

    await act(async () => {
      resolveSchedule();
      await save;
    });
    expect(current().isSaving).toBe(false);
    expect(current().savedCarry.reminderId).toBe('reminder-2');
    expect(current().reminderMessage).toBe('Reminder scheduled 15 minutes before your Carry.');
  });

  it('does not start a preview when an initial load resolves after unmount', async () => {
    let resolveCarry;
    const carryRead = new Promise((resolve) => {
      resolveCarry = resolve;
    });
    const bibleRepository = { getPassage: jest.fn() };
    const carryRepository = {
      findById: jest.fn(() => carryRead),
      getCategories: jest.fn(async () => ({ ok: true, value: [category] })),
      update: jest.fn(),
    };
    await mount(makeOptions({ bibleRepository, carryRepository }));

    await unmountProbe(renderer);
    renderer = undefined;
    await act(async () => resolveCarry({ ok: true, value: carry() }));

    expect(bibleRepository.getPassage).not.toHaveBeenCalled();
  });
});
