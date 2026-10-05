import type { BiblePassage } from '../models/BiblePassage';
import type { Carry } from '../models/Carry';
import type { Category } from '../models/Category';
import type { PassageSelection } from '../models/PassageSelection';
import type { BibleRepository, BibleRepositoryResult } from '../repositories/BibleRepository';
import type { CarryRepository, CarryRepositoryResult } from '../repositories/CarryRepository';
import { updateCarryRecord } from './updateCarryRecord';
import type { CarryRecordDraft } from './prepareCarryDraft';

const NOW = new Date('2026-10-02T00:00:00.000Z');
const SELECTION: PassageSelection = {
  startVerseKey: 'JHN.3.16',
  endVerseKey: 'JHN.3.16',
};

function makePassage(): BiblePassage {
  return {
    reference: 'John 3:16',
    verses: [
      {
        key: 'JHN.3.16',
        bookId: 'JHN',
        chapter: 3,
        verse: 16,
        text: 'For God so loved the world.',
      },
    ],
  };
}

function makeOriginal(overrides: Partial<Carry> = {}): Carry {
  return {
    id: 'carry-1',
    categoryId: 'category-old',
    situation: 'Original situation',
    scheduledAt: new Date('2026-10-05T12:00:00.000Z'),
    passage: SELECTION,
    ifThenIntention: 'Original intention',
    reminderId: 'reminder-1',
    createdAt: new Date('2026-09-20T08:30:00.000Z'),
    ...overrides,
  };
}

function makeRepositories(
  original = makeOriginal(),
  updateResponse?: CarryRepositoryResult<Carry | null>,
  passageResponse: BibleRepositoryResult<BiblePassage> = {
    ok: true,
    value: makePassage(),
  },
) {
  const getPassage = jest.fn(async () => passageResponse);
  const findById = jest.fn(async (_id: string): Promise<CarryRepositoryResult<Carry | null>> => ({
    ok: true,
    value: original,
  }));
  const update = jest.fn(
    async (_category: Category, carry: Carry): Promise<CarryRepositoryResult<Carry | null>> => {
      return updateResponse ?? { ok: true as const, value: carry };
    },
  );
  const setReminderId = jest.fn(async () => ({ ok: true as const, value: true }));
  const bibleRepository: BibleRepository = {
    getBooks: async () => ({ ok: true, value: [] }),
    getChapter: async () => ({ ok: true, value: [] }),
    getPassage,
  };
  const carryRepository = { findById, update, setReminderId } as unknown as CarryRepository;

  return { bibleRepository, carryRepository, getPassage, findById, update, setReminderId };
}

function makeDraft(overrides: Partial<CarryRecordDraft> = {}): CarryRecordDraft {
  return {
    categoryName: '  Hope  ',
    situation: '  When I feel anxious  ',
    scheduledAt: new Date('2026-10-06T12:00:00.000Z'),
    passage: SELECTION,
    ifThenIntention: '  I will pause and pray.  ',
    ...overrides,
  };
}

function makeContext(
  bibleRepository: BibleRepository,
  carryRepository: CarryRepository,
  now: () => Date = () => NOW,
) {
  const notifications = {
    requestPermission: jest.fn(async () => true),
    schedule: jest.fn(async () => 'reminder-new'),
    cancel: jest.fn(async () => undefined),
  };
  return {
    bibleRepository,
    carryRepository,
    carryId: 'carry-1',
    categoryId: 'category-candidate',
    notifications,
    now,
  };
}

describe('updateCarryRecord', () => {
  it('validates and updates an upcoming Carry while preserving its identity and lifecycle metadata', async () => {
    const original = makeOriginal();
    const canonicalResult: Carry = {
      ...original,
      categoryId: 'category-hope',
      situation: 'When I feel anxious',
      scheduledAt: new Date('2026-10-06T12:00:00.000Z'),
      ifThenIntention: 'I will pause and pray.',
    };
    const repositories = makeRepositories(original, {
      ok: true,
      value: canonicalResult,
    });
    const context = makeContext(repositories.bibleRepository, repositories.carryRepository);

    const result = await updateCarryRecord(
      makeDraft({ passage: { startVerseKey: ' JHN.3.16 ', endVerseKey: ' JHN.3.16 ' } }),
      context,
    );

    expect(result).toEqual({
      ok: true,
      carry: { ...canonicalResult, reminderId: 'reminder-new' },
      reminderStatus: 'scheduled',
    });
    expect(repositories.getPassage).toHaveBeenCalledWith(SELECTION);
    expect(repositories.findById).toHaveBeenCalledTimes(2);
    expect(repositories.update).toHaveBeenCalledWith(
      { id: 'category-candidate', name: 'Hope' },
      {
        id: original.id,
        categoryId: 'category-candidate',
        situation: 'When I feel anxious',
        scheduledAt: new Date('2026-10-06T12:00:00.000Z'),
        passage: SELECTION,
        ifThenIntention: 'I will pause and pray.',
        reminderId: original.reminderId,
        createdAt: original.createdAt,
      },
      context.now,
    );
    expect(repositories.setReminderId).toHaveBeenCalledWith('carry-1', null);
  });

  it('rejects an original that is already due, even when the draft schedule is future', async () => {
    const repositories = makeRepositories(
      makeOriginal({ scheduledAt: new Date('2026-10-02T00:00:00.000Z') }),
    );

    await expect(
      updateCarryRecord(
        makeDraft(),
        makeContext(repositories.bibleRepository, repositories.carryRepository),
      ),
    ).resolves.toEqual({ ok: false, code: 'not_upcoming' });
    expect(repositories.getPassage).not.toHaveBeenCalled();
    expect(repositories.update).not.toHaveBeenCalled();
  });
});
