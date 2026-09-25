import type { Carry } from '../../entities/Carry';
import { getCarryStatus } from '../getCarryStatus';

const scheduledAt = new Date('2026-09-25T01:00:00.000Z');

function makeCarry(overrides: Partial<Carry> = {}): Carry {
  return {
    id: 'carry-1',
    categoryId: 'category-1',
    situation: 'Before an important conversation',
    scheduledAt,
    passage: {
      startVerseKey: 'JAS.1.19',
      endVerseKey: 'JAS.1.20',
    },
    ifThenIntention: 'If I feel defensive, then I will listen first.',
    createdAt: new Date('2026-09-25T00:00:00.000Z'),
    ...overrides,
  };
}

describe('getCarryStatus', () => {
  it('returns upcoming before the scheduled time', () => {
    const status = getCarryStatus(makeCarry(), new Date('2026-09-25T00:59:59.999Z'));

    expect(status).toBe('upcoming');
  });

  it.each([new Date('2026-09-25T01:00:00.000Z'), new Date('2026-09-25T01:00:00.001Z')])(
    'returns readyToReflect once the scheduled time is reached',
    (now) => {
      const status = getCarryStatus(makeCarry(), now);

      expect(status).toBe('readyToReflect');
    },
  );

  it('returns completed when a reflection exists', () => {
    const carry = makeCarry({
      reflection: {
        id: 'reflection-1',
        alignmentRating: 4,
        whatOccurred: 'I paused and listened.',
        insight: 'A slower response helped.',
        createdAt: new Date('2026-09-25T01:30:00.000Z'),
      },
    });

    const status = getCarryStatus(carry, new Date('2026-09-25T02:00:00.000Z'));

    expect(status).toBe('completed');
  });
});
