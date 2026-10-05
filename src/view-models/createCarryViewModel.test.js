const React = require('react');
const { afterEach, expect, it, jest } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');
const { useCreateCarryViewModel } = require('./useCreateCarryViewModel');

const { act } = React;
const INITIAL_SELECTION = {
  startVerseKey: 'JHN.3.16',
  endVerseKey: 'JHN.3.16',
};
const FUTURE_DATE = new Date('2026-10-03T12:00:00.000Z');
const NOW = new Date('2026-10-02T00:00:00.000Z');

let renderer;

function passage(selection, reference = 'John 3:16') {
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
    getCategories: jest.fn(async () => ({ ok: true, value: [] })),
    create: jest.fn(async (_category, carry) => ({ ok: true, value: carry })),
  };

  return {
    bibleRepository,
    carryRepository,
    notifications: {
      requestPermission: jest.fn(async () => false),
      schedule: jest.fn(),
      cancel: jest.fn(),
    },
    initialSelection: INITIAL_SELECTION,
    createId: jest.fn().mockReturnValueOnce('carry-id').mockReturnValueOnce('category-id'),
    now: jest.fn(() => NOW),
    ...overrides,
  };
}

async function mount(options = makeOptions()) {
  let currentOptions = options;
  let viewModel;

  function Probe() {
    viewModel = useCreateCarryViewModel(currentOptions);
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

async function fillDraft(current) {
  await act(async () => {
    current().onChangeCategory('  Peace  ');
    current().onChangeSituation('  When I feel anxious  ');
    current().onChangeSchedule(FUTURE_DATE);
    current().onChangeIntention('  I will pause and pray.  ');
  });
}

afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
});

it('preserves the draft and stable IDs when storage fails, then allows retry', async () => {
  const options = makeOptions();
  options.carryRepository.getCategories.mockResolvedValue({ ok: false, code: 'unavailable' });
  options.carryRepository.create
    .mockResolvedValueOnce({ ok: false, code: 'unavailable' })
    .mockImplementationOnce(async (_category, carry) => ({ ok: true, value: carry }));
  const { current } = await mount(options);
  await fillDraft(current);
  const draftBeforeSave = current().draft;

  expect(current().categoryLoadFailed).toBe(true);
  await act(async () => current().save());

  expect(current().saveError).toBe('Your Carry could not be saved. Please try again.');
  expect(current().draft).toEqual(draftBeforeSave);
  expect(current().savedCarry).toBeNull();

  await act(async () => current().save());

  expect(current().saveError).toBeNull();
  expect(current().savedCarry.id).toBe('carry-id');
  expect(options.carryRepository.create).toHaveBeenCalledTimes(2);
  expect(
    options.carryRepository.create.mock.calls.map(([category, carry]) => [category.id, carry.id]),
  ).toEqual([
    ['category-id', 'carry-id'],
    ['category-id', 'carry-id'],
  ]);
  expect(options.createId).toHaveBeenCalledTimes(2);
});

it('ignores duplicate saves and locks the draft after success', async () => {
  const options = makeOptions();
  let resolveBibleCheck;
  const bibleCheck = new Promise((resolve) => {
    resolveBibleCheck = resolve;
  });
  let resolveCreate;
  options.carryRepository.create.mockImplementation(
    (_category, carry) =>
      new Promise((resolve) => {
        resolveCreate = () => resolve({ ok: true, value: carry });
      }),
  );
  const { current, update } = await mount(options);
  await fillDraft(current);
  // Delay Save's validation read, not the preview read performed while mounting.
  options.bibleRepository.getPassage.mockReturnValueOnce(bibleCheck);

  let firstSave;
  let duplicateSave;
  await act(async () => {
    firstSave = current().save();
    duplicateSave = current().save();
  });
  expect(options.carryRepository.create).not.toHaveBeenCalled();
  await update({
    initialSelection: { startVerseKey: 'JHN.3.17', endVerseKey: 'JHN.3.17' },
  });
  await act(async () => current().onChangeSituation('A changed value'));
  expect(current().draft.passage).toEqual(INITIAL_SELECTION);
  expect(current().draft.situation).toBe('  When I feel anxious  ');

  await act(async () => resolveBibleCheck({ ok: true, value: passage(INITIAL_SELECTION) }));
  expect(options.carryRepository.create).toHaveBeenCalledTimes(1);

  const submittedSituation = current().draft.situation;
  await act(async () => {
    resolveCreate();
    await Promise.all([firstSave, duplicateSave]);
  });
  expect(current().savedCarry).not.toBeNull();

  await act(async () => {
    current().onChangeSituation('A changed value');
    await current().save();
  });
  expect(current().draft.situation).toBe(submittedSituation);
  expect(options.carryRepository.create).toHaveBeenCalledTimes(1);
  expect(options.notifications.requestPermission).toHaveBeenCalledTimes(1);
  expect(current().reminderMessage).toContain('Reminders are disabled');
});
