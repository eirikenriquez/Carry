const React = require('react');
const { afterEach, describe, expect, it, jest } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');
const { useEditCarryViewModel } = require('./useEditCarryViewModel');

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
});
