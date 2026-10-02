import type { Carry } from '../../domain/entities/Carry';
import type { Category } from '../../domain/entities/Category';
import type { PassageSelection } from '../../domain/entities/PassageSelection';
import { createCarry as buildCarry } from '../../domain/factories/createCarry';
import type { BibleRepository } from '../ports/BibleRepository';
import type { CarryRepository, CarryRepositoryResult } from '../ports/CarryRepository';

export interface CreateCarryDraft {
  readonly categoryName: string;
  readonly situation: string;
  readonly scheduledAt: Date;
  readonly passage: PassageSelection;
  readonly ifThenIntention: string;
}

export interface CreateCarryRecordContext {
  readonly bibleRepository: BibleRepository;
  readonly carryRepository: CarryRepository;
  readonly carryId: string;
  readonly categoryId: string;
  readonly now: () => Date;
}

export type CreateCarryRecordValidationIssue = {
  readonly field: 'categoryName' | 'situation' | 'scheduledAt' | 'passage' | 'ifThenIntention';
  readonly code: 'required' | 'invalid_date' | 'must_be_future' | 'invalid_selection';
};

export type CreateCarryRecordResult =
  | { readonly ok: true; readonly carry: Carry }
  | {
      readonly ok: false;
      readonly code: 'validation';
      readonly issues: readonly CreateCarryRecordValidationIssue[];
    }
  | { readonly ok: false; readonly code: 'unavailable'; readonly source: 'bible' | 'storage' };

/** Validate a draft and both repositories before creating a category and Carry together. */
export async function createCarryRecord(
  draft: CreateCarryDraft,
  context: CreateCarryRecordContext,
): Promise<CreateCarryRecordResult> {
  const categoryName = draft.categoryName.trim();
  const created = buildCarry(
    {
      id: context.carryId,
      categoryId: context.categoryId,
      situation: draft.situation,
      scheduledAt: draft.scheduledAt,
      passage: draft.passage,
      ifThenIntention: draft.ifThenIntention,
    },
    context.now(),
  );

  const issues: CreateCarryRecordValidationIssue[] = [];
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
          // Both verse-key errors describe one invalid passage field in the form.
          if (!issues.some((entry) => entry.field === 'passage')) {
            issues.push({ field: 'passage', code: 'required' });
          }
          break;
        case 'id':
        case 'categoryId':
          throw new Error(`Carry creation context contains an invalid ${issue.field}.`);
        default:
          throw new Error(
            `Carry factory returned an unsupported validation field: ${issue.field}.`,
          );
      }
    }
  }

  if (issues.length > 0) return { ok: false, code: 'validation', issues };
  if (!created.ok) throw new Error('Carry factory returned unmapped validation issues.');

  try {
    const passage = await context.bibleRepository.getPassage(created.carry.passage);
    if (!passage.ok) {
      if (passage.code === 'invalid_selection') {
        return {
          ok: false,
          code: 'validation',
          issues: [{ field: 'passage', code: 'invalid_selection' }],
        };
      }
      return { ok: false, code: 'unavailable', source: 'bible' };
    }
  } catch {
    return { ok: false, code: 'unavailable', source: 'bible' };
  }

  // A slow Bible read may outlast a near-term schedule; check again before writing.
  const revalidated = buildCarry(created.carry, context.now());
  if (!revalidated.ok) {
    return {
      ok: false,
      code: 'validation',
      issues: [{ field: 'scheduledAt', code: 'must_be_future' }],
    };
  }

  const category: Category = { id: revalidated.carry.categoryId, name: categoryName };
  let stored: CarryRepositoryResult<Carry>;
  try {
    stored = await context.carryRepository.create(category, revalidated.carry);
  } catch {
    return { ok: false, code: 'unavailable', source: 'storage' };
  }

  if (!stored.ok) {
    if (stored.code === 'unavailable') return { ok: false, code: 'unavailable', source: 'storage' };
    throw new Error('Carry repository rejected a validated Carry record.');
  }

  return { ok: true, carry: stored.value };
}
