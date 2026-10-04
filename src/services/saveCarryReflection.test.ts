import type { Carry } from '../models/Carry';
import type { Reflection } from '../models/Reflection';
import type { CarryRepository, CarryRepositoryResult } from '../repositories/CarryRepository';
import { saveCarryReflection, type SaveCarryReflectionResult } from './saveCarryReflection';

const NOW = new Date('2026-10-05T12:00:00.000Z');

function makeCarry(overrides: Partial<Carry> = {}): Carry {
  return {
    id: 'carry-1',
    categoryId: 'work',
    situation: 'A difficult conversation',
    scheduledAt: new Date('2026-10-04T12:00:00.000Z'),
    passage: { startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.20' },
    ifThenIntention: 'If I feel defensive, then I will listen first.',
    reminderId: 'reminder-1',
    createdAt: new Date('2026-10-02T01:00:00.000Z'),
    ...overrides,
  };
}

function makeReflection(overrides: Partial<Reflection> = {}): Reflection {
  return {
    id: 'reflection-existing',
    alignmentRating: 4,
    whatOccurred: 'I listened first.',
    insight: 'Pausing helped.',
    createdAt: new Date('2026-10-05T11:00:00.000Z'),
    ...overrides,
  };
}

function makeRepository(carry: Carry | null = makeCarry()) {
  const findById = jest.fn(async (_id: string): Promise<CarryRepositoryResult<Carry | null>> => ({
    ok: true,
    value: carry,
  }));
  const recordReflection = jest.fn(
    async (
      _carryId: string,
      reflection: Reflection,
      _now: () => Date,
    ): Promise<CarryRepositoryResult<Carry | null>> => ({
      ok: true,
      value: carry ? { ...carry, reflection } : null,
    }),
  );
  const carryRepository = { findById, recordReflection } as unknown as CarryRepository;
  return { carryRepository, findById, recordReflection };
}

function makeContext(
  carryRepository: CarryRepository,
  now: () => Date = () => new Date(NOW.getTime()),
) {
  return { carryRepository, carryId: 'carry-1', reflectionId: 'reflection-1', now };
}

describe('saveCarryReflection', () => {
  it('trims a validated draft and preserves the stored Carry metadata', async () => {
    const original = makeCarry();
    const repositories = makeRepository(original);
    const now = jest.fn(() => new Date(NOW.getTime()));
    const context = makeContext(repositories.carryRepository, now);
    const reflection = {
      id: 'reflection-1',
      alignmentRating: 5 as const,
      whatOccurred: 'I paused before answering.',
      insight: 'Listening first kept the conversation calm.',
      createdAt: NOW,
    };

    await expect(
      saveCarryReflection(
        {
          alignmentRating: 5,
          whatOccurred: '  I paused before answering.  ',
          insight: '  Listening first kept the conversation calm.  ',
        },
        context,
      ),
    ).resolves.toEqual({ ok: true, carry: { ...original, reflection } });

    expect(repositories.findById).toHaveBeenCalledWith('carry-1');
    expect(repositories.recordReflection).toHaveBeenCalledWith('carry-1', reflection, now);
    expect(original.reflection).toBeUndefined();
    expect(original.reminderId).toBe('reminder-1');
  });

  it('returns domain validation issues without attempting a write', async () => {
    const repositories = makeRepository();

    await expect(
      saveCarryReflection(
        { alignmentRating: 7, whatOccurred: '  ', insight: ' ' },
        makeContext(repositories.carryRepository),
      ),
    ).resolves.toEqual({
      ok: false,
      code: 'validation',
      issues: [
        { field: 'alignmentRating', code: 'invalid_rating' },
        { field: 'whatOccurred', code: 'required' },
        { field: 'insight', code: 'required' },
      ],
    });
    expect(repositories.recordReflection).not.toHaveBeenCalled();
  });

  it('maps missing, not-ready, and already-reflected stored Carries', async () => {
    const missing = makeRepository(null);
    await expect(
      saveCarryReflection(
        { alignmentRating: 4, whatOccurred: 'I paused.', insight: 'That helped.' },
        makeContext(missing.carryRepository),
      ),
    ).resolves.toEqual({ ok: false, code: 'not_found' });

    const upcoming = makeRepository(
      makeCarry({ scheduledAt: new Date('2026-10-06T12:00:00.000Z') }),
    );
    await expect(
      saveCarryReflection(
        { alignmentRating: 4, whatOccurred: 'I paused.', insight: 'That helped.' },
        makeContext(upcoming.carryRepository),
      ),
    ).resolves.toEqual({ ok: false, code: 'not_ready' });

    const alreadyReflected = makeRepository(makeCarry({ reflection: makeReflection() }));
    await expect(
      saveCarryReflection(
        { alignmentRating: 4, whatOccurred: 'I paused.', insight: 'That helped.' },
        makeContext(alreadyReflected.carryRepository),
      ),
    ).resolves.toEqual({ ok: false, code: 'already_reflected' });

    expect(missing.recordReflection).not.toHaveBeenCalled();
    expect(upcoming.recordReflection).not.toHaveBeenCalled();
    expect(alreadyReflected.recordReflection).not.toHaveBeenCalled();
  });

  it('maps commit-time lifecycle changes and storage failures', async () => {
    const outcomes: readonly {
      readonly response: CarryRepositoryResult<Carry | null>;
      readonly expected: SaveCarryReflectionResult;
    }[] = [
      {
        response: { ok: false, code: 'not_ready' },
        expected: { ok: false, code: 'not_ready' },
      },
      {
        response: { ok: false, code: 'already_reflected' },
        expected: { ok: false, code: 'already_reflected' },
      },
      {
        response: { ok: false, code: 'unavailable' },
        expected: { ok: false, code: 'unavailable' },
      },
      {
        response: { ok: false, code: 'invalid_record' },
        expected: { ok: false, code: 'unavailable' },
      },
      { response: { ok: true, value: null }, expected: { ok: false, code: 'not_found' } },
    ];

    for (const { response, expected } of outcomes) {
      const repositories = makeRepository();
      repositories.recordReflection.mockResolvedValue(response);
      await expect(
        saveCarryReflection(
          { alignmentRating: 4, whatOccurred: 'I paused.', insight: 'That helped.' },
          makeContext(repositories.carryRepository),
        ),
      ).resolves.toEqual(expected);
      expect(repositories.recordReflection).toHaveBeenCalledTimes(1);
    }
  });

  it('contains repository exceptions and invalid injected-clock values', async () => {
    const readFailure = makeRepository();
    readFailure.findById.mockRejectedValue(new Error('Read failed'));
    await expect(
      saveCarryReflection(
        { alignmentRating: 4, whatOccurred: 'I paused.', insight: 'That helped.' },
        makeContext(readFailure.carryRepository),
      ),
    ).resolves.toEqual({ ok: false, code: 'unavailable' });

    const writeFailure = makeRepository();
    writeFailure.recordReflection.mockRejectedValue(new Error('Write failed'));
    await expect(
      saveCarryReflection(
        { alignmentRating: 4, whatOccurred: 'I paused.', insight: 'That helped.' },
        makeContext(writeFailure.carryRepository),
      ),
    ).resolves.toEqual({ ok: false, code: 'unavailable' });

    const invalidClock = makeRepository();
    await expect(
      saveCarryReflection(
        { alignmentRating: 4, whatOccurred: 'I paused.', insight: 'That helped.' },
        makeContext(invalidClock.carryRepository, () => new Date(Number.NaN)),
      ),
    ).resolves.toEqual({ ok: false, code: 'unavailable' });
    expect(invalidClock.recordReflection).not.toHaveBeenCalled();
  });
});
