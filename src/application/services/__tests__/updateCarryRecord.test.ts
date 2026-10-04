import type { BiblePassage } from '../../../domain/entities/BiblePassage';
import type { Carry } from '../../../domain/entities/Carry';
import type { Category } from '../../../domain/entities/Category';
import type { PassageSelection } from '../../../domain/entities/PassageSelection';
import type { BibleRepository, BibleRepositoryResult } from '../../ports/BibleRepository';
import type { CarryRepository, CarryRepositoryResult } from '../../ports/CarryRepository';
import { updateCarryRecord } from '../updateCarryRecord';
import type { CarryRecordDraft } from '../prepareCarryDraft';

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

  it('returns aggregated draft validation errors without Bible reads or writes', async () => {
    const repositories = makeRepositories();
    const result = await updateCarryRecord(
      makeDraft({
        categoryName: '  ',
        situation: ' ',
        scheduledAt: new Date(Number.NaN),
        passage: { startVerseKey: ' ', endVerseKey: ' ' },
        ifThenIntention: '',
      }),
      makeContext(repositories.bibleRepository, repositories.carryRepository),
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
    expect(repositories.getPassage).not.toHaveBeenCalled();
    expect(repositories.update).not.toHaveBeenCalled();
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

  it('rejects when the original becomes due while the Bible passage is loading', async () => {
    let resolvePassage: (result: BibleRepositoryResult<BiblePassage>) => void = () => undefined;
    let markPassageStarted: () => void = () => undefined;
    const passageStarted = new Promise<void>((resolve) => {
      markPassageStarted = resolve;
    });
    const delayedPassage = new Promise<BibleRepositoryResult<BiblePassage>>((resolve) => {
      resolvePassage = resolve;
    });
    const original = makeOriginal({ scheduledAt: new Date('2026-10-02T00:00:02.000Z') });
    const repositories = makeRepositories(original);
    repositories.getPassage.mockImplementationOnce(() => {
      markPassageStarted();
      return delayedPassage;
    });
    let currentTime = NOW;
    const now = jest.fn(() => currentTime);

    const operation = updateCarryRecord(
      makeDraft(),
      makeContext(repositories.bibleRepository, repositories.carryRepository, now),
    );
    await passageStarted;
    currentTime = new Date('2026-10-02T00:00:03.000Z');
    resolvePassage({ ok: true, value: makePassage() });

    await expect(operation).resolves.toEqual({ ok: false, code: 'not_upcoming' });
    expect(repositories.findById).toHaveBeenCalledTimes(2);
    expect(repositories.update).not.toHaveBeenCalled();
  });

  it('rejects a draft schedule that expires during Bible validation', async () => {
    let resolvePassage: (result: BibleRepositoryResult<BiblePassage>) => void = () => undefined;
    let markPassageStarted: () => void = () => undefined;
    const passageStarted = new Promise<void>((resolve) => {
      markPassageStarted = resolve;
    });
    const delayedPassage = new Promise<BibleRepositoryResult<BiblePassage>>((resolve) => {
      resolvePassage = resolve;
    });
    const repositories = makeRepositories();
    repositories.getPassage.mockImplementationOnce(() => {
      markPassageStarted();
      return delayedPassage;
    });
    let currentTime = NOW;
    const now = jest.fn(() => currentTime);

    const operation = updateCarryRecord(
      makeDraft({ scheduledAt: new Date('2026-10-02T00:00:02.000Z') }),
      makeContext(repositories.bibleRepository, repositories.carryRepository, now),
    );
    await passageStarted;
    currentTime = new Date('2026-10-02T00:00:03.000Z');
    resolvePassage({ ok: true, value: makePassage() });

    await expect(operation).resolves.toEqual({
      ok: false,
      code: 'validation',
      issues: [{ field: 'scheduledAt', code: 'must_be_future' }],
    });
    expect(repositories.findById).toHaveBeenCalledTimes(2);
    expect(repositories.update).not.toHaveBeenCalled();
  });

  it('maps missing records and repository outages to controlled results', async () => {
    const missing = makeRepositories();
    missing.findById.mockResolvedValueOnce({ ok: true, value: null });
    await expect(
      updateCarryRecord(makeDraft(), makeContext(missing.bibleRepository, missing.carryRepository)),
    ).resolves.toEqual({ ok: false, code: 'not_found' });
    expect(missing.getPassage).not.toHaveBeenCalled();

    const unavailable = makeRepositories();
    unavailable.findById.mockResolvedValueOnce({ ok: false, code: 'unavailable' });
    await expect(
      updateCarryRecord(
        makeDraft(),
        makeContext(unavailable.bibleRepository, unavailable.carryRepository),
      ),
    ).resolves.toEqual({ ok: false, code: 'unavailable', source: 'storage' });

    const removedDuringValidation = makeRepositories();
    removedDuringValidation.findById
      .mockResolvedValueOnce({ ok: true, value: makeOriginal() })
      .mockResolvedValueOnce({ ok: true, value: null });
    await expect(
      updateCarryRecord(
        makeDraft(),
        makeContext(
          removedDuringValidation.bibleRepository,
          removedDuringValidation.carryRepository,
        ),
      ),
    ).resolves.toEqual({ ok: false, code: 'not_found' });
    expect(removedDuringValidation.update).not.toHaveBeenCalled();

    const storageFailure = makeRepositories(undefined, { ok: false, code: 'unavailable' });
    await expect(
      updateCarryRecord(
        makeDraft(),
        makeContext(storageFailure.bibleRepository, storageFailure.carryRepository),
      ),
    ).resolves.toEqual({ ok: false, code: 'unavailable', source: 'storage' });
  });

  it('returns not_found when the atomic update reports that the record disappeared', async () => {
    const repositories = makeRepositories(undefined, { ok: true, value: null });

    await expect(
      updateCarryRecord(
        makeDraft(),
        makeContext(repositories.bibleRepository, repositories.carryRepository),
      ),
    ).resolves.toEqual({ ok: false, code: 'not_found' });
  });

  it('maps transaction-time eligibility failures to not-upcoming or schedule validation', async () => {
    const originalExpired = makeRepositories(undefined, { ok: false, code: 'not_upcoming' });
    await expect(
      updateCarryRecord(
        makeDraft(),
        makeContext(originalExpired.bibleRepository, originalExpired.carryRepository),
      ),
    ).resolves.toEqual({ ok: false, code: 'not_upcoming' });

    const draftSchedule = new Date('2026-10-02T00:00:02.000Z');
    const scheduleExpired = makeRepositories(undefined, { ok: false, code: 'invalid_record' });
    const now = jest
      .fn()
      .mockReturnValueOnce(NOW)
      .mockReturnValueOnce(NOW)
      .mockReturnValueOnce(new Date('2026-10-02T00:00:03.000Z'));
    await expect(
      updateCarryRecord(
        makeDraft({ scheduledAt: draftSchedule }),
        makeContext(scheduleExpired.bibleRepository, scheduleExpired.carryRepository, now),
      ),
    ).resolves.toEqual({
      ok: false,
      code: 'validation',
      issues: [{ field: 'scheduledAt', code: 'must_be_future' }],
    });
  });
});
