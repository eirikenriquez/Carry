import type { BiblePassage } from '../models/BiblePassage';
import type { Carry } from '../models/Carry';
import type { Category } from '../models/Category';
import type { PassageSelection } from '../models/PassageSelection';
import type { BibleRepository, BibleRepositoryResult } from '../repositories/BibleRepository';
import type { CarryRepository, CarryRepositoryResult } from '../repositories/CarryRepository';
import { createCarryRecord, type CreateCarryDraft } from './createCarryRecord';

const NOW = new Date('2026-10-02T00:00:00.000Z');
const SELECTION: PassageSelection = {
  startVerseKey: 'JHN.3.16',
  endVerseKey: 'JHN.3.16',
};

function makePassage(selection: PassageSelection): BiblePassage {
  const [bookId, chapter, verse] = selection.startVerseKey.split('.');
  return {
    reference: 'John 3:16',
    verses: [
      {
        key: selection.startVerseKey,
        bookId: bookId ?? '',
        chapter: Number(chapter),
        verse: Number(verse),
        text: 'For God so loved the world.',
      },
    ],
  };
}

function makeRepositories(
  bibleResponse: BibleRepositoryResult<BiblePassage> = {
    ok: true,
    value: makePassage(SELECTION),
  },
  createResponse?: CarryRepositoryResult<Carry>,
) {
  const getPassage = jest.fn(async () => bibleResponse);
  const create = jest.fn(async (_category: Category, carry: Carry) => {
    return createResponse ?? { ok: true as const, value: carry };
  });
  const bibleRepository: BibleRepository = {
    getBooks: async () => ({ ok: true, value: [] }),
    getChapter: async () => ({ ok: true, value: [] }),
    getPassage,
  };
  const carryRepository = { create } as unknown as CarryRepository;

  return { bibleRepository, carryRepository, getPassage, create };
}

function makeDraft(overrides: Partial<CreateCarryDraft> = {}): CreateCarryDraft {
  return {
    categoryName: '  Peace  ',
    situation: '  When I feel anxious  ',
    scheduledAt: new Date('2026-10-03T12:00:00.000Z'),
    passage: SELECTION,
    ifThenIntention: '  I will pause and pray.  ',
    ...overrides,
  };
}

const CONTEXT_BASE = {
  carryId: 'carry-1',
  categoryId: 'category-1',
  now: () => NOW,
};

describe('createCarryRecord', () => {
  it('validates the passage and stores normalized values with the category', async () => {
    const { bibleRepository, carryRepository, getPassage, create } = makeRepositories();
    const writeTime = new Date('2026-10-02T00:00:01.000Z');
    const now = jest.fn().mockReturnValueOnce(NOW).mockReturnValueOnce(writeTime);
    const result = await createCarryRecord(
      makeDraft({
        passage: { startVerseKey: ' JHN.3.16 ', endVerseKey: ' JHN.3.16 ' },
      }),
      {
        ...CONTEXT_BASE,
        bibleRepository,
        carryRepository,
        now,
      },
    );

    expect(result).toEqual({
      ok: true,
      carry: {
        id: 'carry-1',
        categoryId: 'category-1',
        situation: 'When I feel anxious',
        scheduledAt: new Date('2026-10-03T12:00:00.000Z'),
        passage: SELECTION,
        ifThenIntention: 'I will pause and pray.',
        createdAt: writeTime,
      },
    });
    expect(now).toHaveBeenCalledTimes(2);
    expect(getPassage).toHaveBeenCalledWith(SELECTION);
    expect(create).toHaveBeenCalledWith(
      { id: 'category-1', name: 'Peace' },
      expect.objectContaining({ situation: 'When I feel anxious' }),
    );
  });

  it('returns a controlled storage failure after Bible validation succeeds', async () => {
    const { bibleRepository, carryRepository, create } = makeRepositories(undefined, {
      ok: false,
      code: 'unavailable',
    });
    const result = await createCarryRecord(makeDraft(), {
      ...CONTEXT_BASE,
      bibleRepository,
      carryRepository,
    });

    expect(result).toEqual({ ok: false, code: 'unavailable', source: 'storage' });
    expect(create).toHaveBeenCalledTimes(1);

    const thrown = makeRepositories();
    thrown.create.mockRejectedValue(new Error('Database connection lost.'));
    await expect(
      createCarryRecord(makeDraft(), {
        ...CONTEXT_BASE,
        bibleRepository: thrown.bibleRepository,
        carryRepository: thrown.carryRepository,
      }),
    ).resolves.toEqual({ ok: false, code: 'unavailable', source: 'storage' });
  });
});
