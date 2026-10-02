import type { PassageSelection } from '../../../domain/entities/PassageSelection';

export interface CarryFormDraft {
  readonly categoryName: string;
  readonly situation: string;
  readonly scheduledAt: Date | null;
  readonly passage: PassageSelection;
  readonly ifThenIntention: string;
}

export type CarryFormField =
  'categoryName' | 'situation' | 'scheduledAt' | 'passage' | 'ifThenIntention';

export type CarryFormErrors = Partial<Record<CarryFormField, string>>;

export type CarryFormMode = 'create' | 'edit';

export type CarryFormIssueCode =
  'invalid_date' | 'must_be_future' | 'invalid_selection' | 'required';

export interface CarryFormValidationIssue {
  readonly field: CarryFormField;
  readonly code: CarryFormIssueCode;
}

/** Give both forms the same short feedback for each validation code. */
export function validationMessage(issue: CarryFormValidationIssue): string {
  switch (issue.code) {
    case 'invalid_date':
      return 'Choose a valid schedule date.';
    case 'must_be_future':
      return 'Choose a time in the future.';
    case 'invalid_selection':
      return 'Choose a valid Bible passage.';
    case 'required':
      switch (issue.field) {
        case 'categoryName':
          return 'Choose or enter a category.';
        case 'situation':
          return 'Add the situation you want to prepare for.';
        case 'scheduledAt':
          return 'Choose a schedule date.';
        case 'passage':
          return 'Choose a Bible passage.';
        case 'ifThenIntention':
          return 'Add your if–then intention.';
      }
  }
  return 'Check this field.';
}

export function clearFieldError(current: CarryFormErrors, field: CarryFormField): CarryFormErrors {
  if (current[field] === undefined) return current;
  const next = { ...current };
  delete next[field];
  return next;
}

export function sameSelection(left: PassageSelection, right: PassageSelection): boolean {
  return left.startVerseKey === right.startVerseKey && left.endVerseKey === right.endVerseKey;
}
