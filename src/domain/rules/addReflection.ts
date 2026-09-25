import type { Carry } from '../entities/Carry';
import type { AlignmentRating } from '../entities/Reflection';

export interface AddReflectionInput {
  readonly id: string;
  readonly alignmentRating: number;
  readonly whatOccurred: string;
  readonly insight: string;
}

export type AddReflectionValidationField =
  'id' | 'alignmentRating' | 'whatOccurred' | 'insight' | 'createdAt' | 'reflection';

export type AddReflectionValidationCode =
  'required' | 'invalid_rating' | 'before_scheduled_time' | 'already_exists';

export interface AddReflectionValidationIssue {
  readonly field: AddReflectionValidationField;
  readonly code: AddReflectionValidationCode;
}

export type AddReflectionResult =
  | { readonly ok: true; readonly carry: Carry }
  | { readonly ok: false; readonly issues: readonly AddReflectionValidationIssue[] };

function toAlignmentRating(value: number): AlignmentRating | undefined {
  if (Number.isInteger(value) && value >= 1 && value <= 5) {
    return value as AlignmentRating;
  }

  return undefined;
}

export function addReflection(
  carry: Carry,
  input: AddReflectionInput,
  now: Date,
): AddReflectionResult {
  const currentTimestamp = now.getTime();
  const scheduledTimestamp = carry.scheduledAt.getTime();
  if (Number.isNaN(currentTimestamp) || Number.isNaN(scheduledTimestamp)) {
    throw new RangeError('Reflection and scheduled times must be valid dates.');
  }

  const id = input.id.trim();
  const alignmentRating = toAlignmentRating(input.alignmentRating);
  const whatOccurred = input.whatOccurred.trim();
  const insight = input.insight.trim();
  const issues: AddReflectionValidationIssue[] = [];

  if (!id) {
    issues.push({ field: 'id', code: 'required' });
  }
  if (alignmentRating === undefined) {
    issues.push({ field: 'alignmentRating', code: 'invalid_rating' });
  }
  if (!whatOccurred) {
    issues.push({ field: 'whatOccurred', code: 'required' });
  }
  if (!insight) {
    issues.push({ field: 'insight', code: 'required' });
  }
  if (currentTimestamp < scheduledTimestamp) {
    issues.push({ field: 'createdAt', code: 'before_scheduled_time' });
  }
  if (carry.reflection) {
    issues.push({ field: 'reflection', code: 'already_exists' });
  }

  if (issues.length > 0 || alignmentRating === undefined) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    carry: {
      ...carry,
      reflection: {
        id,
        alignmentRating,
        whatOccurred,
        insight,
        createdAt: new Date(currentTimestamp),
      },
    },
  };
}
