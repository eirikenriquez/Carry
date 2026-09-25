import type { Carry } from '../../entities/Carry';
import { addReflection, type AddReflectionInput } from '../addReflection';

const scheduledAt = new Date('2026-09-25T01:00:00.000Z');
const reflectionTime = new Date('2026-09-25T01:30:00.000Z');

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

function makeValidInput(): AddReflectionInput {
  return {
    id: 'reflection-1',
    alignmentRating: 4,
    whatOccurred: '  I paused and listened.  ',
    insight: '  A slower response helped.  ',
  };
}

describe('addReflection', () => {
  it.each([1, 5])('accepts the rating boundary %i', (alignmentRating) => {
    const carry = makeCarry();

    const result = addReflection(carry, { ...makeValidInput(), alignmentRating }, reflectionTime);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected adding the reflection to succeed.');
    }

    expect(result.carry).not.toBe(carry);
    expect(carry.reflection).toBeUndefined();
    expect(result.carry.reflection).toEqual({
      id: 'reflection-1',
      alignmentRating,
      whatOccurred: 'I paused and listened.',
      insight: 'A slower response helped.',
      createdAt: reflectionTime,
    });
    expect(result.carry.reflection?.createdAt).not.toBe(reflectionTime);
  });

  it.each([0, 2.5, 6])('rejects the invalid rating %s', (alignmentRating) => {
    const result = addReflection(
      makeCarry(),
      { ...makeValidInput(), alignmentRating },
      reflectionTime,
    );

    expect(result).toEqual({
      ok: false,
      issues: [{ field: 'alignmentRating', code: 'invalid_rating' }],
    });
  });

  it('returns every missing required value', () => {
    const result = addReflection(
      makeCarry(),
      {
        ...makeValidInput(),
        id: ' ',
        whatOccurred: '',
        insight: ' ',
      },
      reflectionTime,
    );

    expect(result).toEqual({
      ok: false,
      issues: [
        { field: 'id', code: 'required' },
        { field: 'whatOccurred', code: 'required' },
        { field: 'insight', code: 'required' },
      ],
    });
  });

  it('rejects a reflection before the scheduled situation', () => {
    const result = addReflection(
      makeCarry(),
      makeValidInput(),
      new Date('2026-09-25T00:59:59.999Z'),
    );

    expect(result).toEqual({
      ok: false,
      issues: [{ field: 'createdAt', code: 'before_scheduled_time' }],
    });
  });

  it('rejects a second reflection', () => {
    const carry = makeCarry({
      reflection: {
        id: 'existing-reflection',
        alignmentRating: 3,
        whatOccurred: 'Something happened.',
        insight: 'I learned something.',
        createdAt: reflectionTime,
      },
    });

    const result = addReflection(carry, makeValidInput(), reflectionTime);

    expect(result).toEqual({
      ok: false,
      issues: [{ field: 'reflection', code: 'already_exists' }],
    });
  });
});
