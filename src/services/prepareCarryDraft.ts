/**
 * Defines draft and result types for preparing a Carry record.
 * It normalizes a form draft and maps domain validation to the shared form fields.
 */
import type { Carry } from '../models/Carry';
import type { Category } from '../models/Category';
import type { PassageSelection } from '../models/PassageSelection';
import { createCarry as buildCarry } from '../models/createCarry';

export interface CarryRecordDraft {
  readonly categoryName: string;
  readonly situation: string;
  readonly scheduledAt: Date;
  readonly passage: PassageSelection;
  readonly ifThenIntention: string;
}

export type CarryRecordValidationIssue = {
  readonly field: 'categoryName' | 'situation' | 'scheduledAt' | 'passage' | 'ifThenIntention';
  readonly code: 'required' | 'invalid_date' | 'must_be_future' | 'invalid_selection';
};

export type PreparedCarryDraftResult =
  | { readonly ok: true; readonly category: Category; readonly carry: Carry }
  | { readonly ok: false; readonly issues: readonly CarryRecordValidationIssue[] };

export function prepareCarryDraft(
  draft: CarryRecordDraft,
  identity: { readonly carryId: string; readonly categoryId: string },
  now: Date,
): PreparedCarryDraftResult {
  const categoryName = draft.categoryName.trim();
  const created = buildCarry(
    {
      id: identity.carryId,
      categoryId: identity.categoryId,
      situation: draft.situation,
      scheduledAt: draft.scheduledAt,
      passage: draft.passage,
      ifThenIntention: draft.ifThenIntention,
    },
    now,
  );

  const issues: CarryRecordValidationIssue[] = [];
  if (!categoryName) issues.push({ field: 'categoryName', code: 'required' });

  if (!created.ok) {
    for (const issue of created.issues) {
      switch (issue.field) {
        case 'situation':
        case 'scheduledAt':
        case 'ifThenIntention':
          issues.push({ field: issue.field, code: issue.code });
          break;
        case 'passage.startVerseKey':
        case 'passage.endVerseKey':
          // Both keys map to one passage field in the form.
          if (!issues.some((entry) => entry.field === 'passage')) {
            issues.push({ field: 'passage', code: 'required' });
          }
          break;
        case 'id':
        case 'categoryId':
          throw new Error(`Carry context contains an invalid ${issue.field}.`);
        default:
          throw new Error(
            `Carry factory returned an unsupported validation field: ${issue.field}.`,
          );
      }
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  if (!created.ok) throw new Error('Carry factory returned unmapped validation issues.');

  return {
    ok: true,
    category: { id: created.carry.categoryId, name: categoryName },
    carry: created.carry,
  };
}
