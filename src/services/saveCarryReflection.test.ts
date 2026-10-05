import type { Carry } from '../models/Carry';
import type { Reflection } from '../models/Reflection';
import type { CarryRepository, CarryRepositoryResult } from '../repositories/CarryRepository';
import { saveCarryReflection } from './saveCarryReflection';

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
});
