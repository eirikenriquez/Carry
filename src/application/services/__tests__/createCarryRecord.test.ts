import type { BiblePassage } from '../../../domain/entities/BiblePassage';
import type { Carry } from '../../../domain/entities/Carry';
import type { Category } from '../../../domain/entities/Category';
import type { PassageSelection } from '../../../domain/entities/PassageSelection';
import type { BibleRepository, BibleRepositoryResult } from '../../ports/BibleRepository';
import type { CarryRepository, CarryRepositoryResult } from '../../ports/CarryRepository';
import {
  createCarryRecord,
  type CreateCarryDraft,
  type CreateCarryRecordResult,
} from '../createCarryRecord';

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
  now: NOW,
};

describe('createCarryRecord', () => {
  it('validates the passage and stores normalized values with the category', async () => {
    const { bibleRepository, carryRepository, getPassage, create } = makeRepositories();
    const result = await createCarryRecord(
      makeDraft({
        passage: { startVerseKey: ' JHN.3.16 ', endVerseKey: ' JHN.3.16 ' },
      }),
      {
        ...CONTEXT_BASE,
        bibleRepository,
        carryRepository,
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
        createdAt: NOW,
      },
    });
    expect(getPassage).toHaveBeenCalledWith(SELECTION);
    expect(create).toHaveBeenCalledWith(
      { id: 'category-1', name: 'Peace' },
      expect.objectContaining({ situation: 'When I feel anxious' }),
    );
  });

  it('aggregates form validation errors without consulting or writing to repositories', async () => {
    const { bibleRepository, carryRepository, getPassage, create } = makeRepositories();
    const result = await createCarryRecord(
      makeDraft({
        categoryName: '  ',
        situation: ' ',
        scheduledAt: new Date(Number.NaN),
        passage: { startVerseKey: ' ', endVerseKey: ' ' },
        ifThenIntention: '',
      }),
      { ...CONTEXT_BASE, bibleRepository, carryRepository },
    );

    expect(result).toEqual({
      ok: false,
      code: 'validation',
      issues: [
        { field: 'categoryName', code: 'required' },
        { field: 'situation', code: 'required' },
        { field: 'passage', code: 'required' },
        { field: 'ifThenIntention', code: 'required' },
        { field: 'scheduledAt', code: 'invalid_date' },
      ],
    });
    expect(getPassage).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('maps invalid selections and Bible outages without creating records', async () => {
    const failures: [BibleRepositoryResult<BiblePassage>, CreateCarryRecordResult][] = [
      [
        { ok: false, code: 'invalid_selection' },
        {
          ok: false,
          code: 'validation',
          issues: [{ field: 'passage', code: 'invalid_selection' }],
        },
      ],
      [
        { ok: false, code: 'unavailable' },
        { ok: false, code: 'unavailable', source: 'bible' },
      ],
    ];

    for (const [response, expected] of failures) {
      const { bibleRepository, carryRepository, getPassage, create } = makeRepositories(response);
      const result = await createCarryRecord(makeDraft(), {
        ...CONTEXT_BASE,
        bibleRepository,
        carryRepository,
      });

      expect(result).toEqual(expected);
      expect(getPassage).toHaveBeenCalledWith(SELECTION);
      expect(create).not.toHaveBeenCalled();
    }

    const { bibleRepository, carryRepository, create } = makeRepositories();
    const getPassage = bibleRepository.getPassage as jest.Mock;
    getPassage.mockRejectedValue(new Error('Bible data is unavailable.'));
    await expect(
      createCarryRecord(makeDraft(), { ...CONTEXT_BASE, bibleRepository, carryRepository }),
    ).resolves.toEqual({ ok: false, code: 'unavailable', source: 'bible' });
    expect(create).not.toHaveBeenCalled();
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
