import { createCarry, type CreateCarryInput } from '../createCarry';

const now = new Date('2026-09-25T00:00:00.000Z');

function makeValidInput(): CreateCarryInput {
  return {
    id: 'carry-1',
    categoryId: 'category-1',
    situation: '  Before an important conversation  ',
    scheduledAt: new Date('2026-09-25T01:00:00.000Z'),
    passage: {
      startVerseKey: '  JAS.1.19  ',
      endVerseKey: '  JAS.1.20  ',
    },
    ifThenIntention: '  If I feel defensive, then I will listen first.  ',
  };
}

describe('createCarry', () => {
  it('creates a Carry with normalized user-entered text', () => {
    const input = makeValidInput();

    const result = createCarry(input, now);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected Carry creation to succeed.');
    }

    expect(result.carry).toEqual({
      id: 'carry-1',
      categoryId: 'category-1',
      situation: 'Before an important conversation',
      scheduledAt: new Date('2026-09-25T01:00:00.000Z'),
      passage: {
        startVerseKey: 'JAS.1.19',
        endVerseKey: 'JAS.1.20',
      },
      ifThenIntention: 'If I feel defensive, then I will listen first.',
      createdAt: now,
    });
    expect(result.carry.scheduledAt).not.toBe(input.scheduledAt);
    expect(result.carry.createdAt).not.toBe(now);
  });

  it('returns every missing required value', () => {
    const input = makeValidInput();

    const result = createCarry(
      {
        ...input,
        id: ' ',
        categoryId: '',
        situation: ' ',
        passage: { startVerseKey: '', endVerseKey: ' ' },
        ifThenIntention: '',
      },
      now,
    );

    expect(result).toEqual({
      ok: false,
      issues: [
        { field: 'id', code: 'required' },
        { field: 'categoryId', code: 'required' },
        { field: 'situation', code: 'required' },
        { field: 'passage.startVerseKey', code: 'required' },
        { field: 'passage.endVerseKey', code: 'required' },
        { field: 'ifThenIntention', code: 'required' },
      ],
    });
  });

  it.each([new Date('2026-09-24T23:59:59.999Z'), new Date('2026-09-25T00:00:00.000Z')])(
    'rejects a scheduled time that is not in the future',
    (scheduledAt) => {
      const result = createCarry({ ...makeValidInput(), scheduledAt }, now);

      expect(result).toEqual({
        ok: false,
        issues: [{ field: 'scheduledAt', code: 'must_be_future' }],
      });
    },
  );

  it('rejects an invalid scheduled date', () => {
    const result = createCarry({ ...makeValidInput(), scheduledAt: new Date('invalid') }, now);

    expect(result).toEqual({
      ok: false,
      issues: [{ field: 'scheduledAt', code: 'invalid_date' }],
    });
  });

  it('throws when the supplied current time is invalid', () => {
    expect(() => createCarry(makeValidInput(), new Date('invalid'))).toThrow(
      'Current time must be a valid date.',
    );
  });
});
