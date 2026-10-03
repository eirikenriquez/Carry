import type { Carry } from '../../domain/entities/Carry';
import type { BibleRepository } from '../ports/BibleRepository';
import type { CarryRepository, CarryRepositoryResult } from '../ports/CarryRepository';
import {
  prepareCarryDraft,
  type CarryRecordDraft,
  type CarryRecordValidationIssue,
} from './prepareCarryDraft';

export type CreateCarryDraft = CarryRecordDraft;
export type CreateCarryRecordValidationIssue = CarryRecordValidationIssue;

export interface CreateCarryRecordContext {
  readonly bibleRepository: BibleRepository;
  readonly carryRepository: CarryRepository;
  readonly carryId: string;
  readonly categoryId: string;
  readonly now: () => Date;
}

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
  const prepared = prepareCarryDraft(draft, context, context.now());
  if (!prepared.ok) return { ok: false, code: 'validation', issues: prepared.issues };

  try {
    const passage = await context.bibleRepository.getPassage(prepared.carry.passage);
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
  const revalidated = prepareCarryDraft(draft, context, context.now());
  if (!revalidated.ok) return { ok: false, code: 'validation', issues: revalidated.issues };

  let stored: CarryRepositoryResult<Carry>;
  try {
    stored = await context.carryRepository.create(revalidated.category, revalidated.carry);
  } catch {
    return { ok: false, code: 'unavailable', source: 'storage' };
  }

  if (!stored.ok) {
    if (stored.code === 'unavailable') return { ok: false, code: 'unavailable', source: 'storage' };
    throw new Error('Carry repository rejected a validated Carry record.');
  }

  return { ok: true, carry: stored.value };
}
