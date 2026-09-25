import type { Carry } from '../entities/Carry';
import type { PassageSelection } from '../entities/PassageSelection';

export interface CreateCarryInput {
  readonly id: string;
  readonly categoryId: string;
  readonly situation: string;
  readonly scheduledAt: Date;
  readonly passage: PassageSelection;
  readonly ifThenIntention: string;
}

export type CreateCarryValidationField =
  | 'id'
  | 'categoryId'
  | 'situation'
  | 'scheduledAt'
  | 'passage.startVerseKey'
  | 'passage.endVerseKey'
  | 'ifThenIntention';

export type CreateCarryValidationCode = 'required' | 'invalid_date' | 'must_be_future';

export interface CreateCarryValidationIssue {
  readonly field: CreateCarryValidationField;
  readonly code: CreateCarryValidationCode;
}

export type CreateCarryResult =
  | { readonly ok: true; readonly carry: Carry }
  | { readonly ok: false; readonly issues: readonly CreateCarryValidationIssue[] };

export function createCarry(input: CreateCarryInput, now: Date): CreateCarryResult {
  const currentTimestamp = now.getTime();
  if (Number.isNaN(currentTimestamp)) {
    throw new RangeError('Current time must be a valid date.');
  }

  const id = input.id.trim();
  const categoryId = input.categoryId.trim();
  const situation = input.situation.trim();
  const startVerseKey = input.passage.startVerseKey.trim();
  const endVerseKey = input.passage.endVerseKey.trim();
  const ifThenIntention = input.ifThenIntention.trim();
  const issues: CreateCarryValidationIssue[] = [];

  if (!id) {
    issues.push({ field: 'id', code: 'required' });
  }
  if (!categoryId) {
    issues.push({ field: 'categoryId', code: 'required' });
  }
  if (!situation) {
    issues.push({ field: 'situation', code: 'required' });
  }
  if (!startVerseKey) {
    issues.push({ field: 'passage.startVerseKey', code: 'required' });
  }
  if (!endVerseKey) {
    issues.push({ field: 'passage.endVerseKey', code: 'required' });
  }
  if (!ifThenIntention) {
    issues.push({ field: 'ifThenIntention', code: 'required' });
  }

  const scheduledTimestamp = input.scheduledAt.getTime();
  if (Number.isNaN(scheduledTimestamp)) {
    issues.push({ field: 'scheduledAt', code: 'invalid_date' });
  } else if (scheduledTimestamp <= currentTimestamp) {
    issues.push({ field: 'scheduledAt', code: 'must_be_future' });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    carry: {
      id,
      categoryId,
      situation,
      scheduledAt: new Date(scheduledTimestamp),
      passage: { startVerseKey, endVerseKey },
      ifThenIntention,
      createdAt: new Date(currentTimestamp),
    },
  };
}
