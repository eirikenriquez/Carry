import type { Carry } from '../models/Carry';
import {
  addReflection,
  type AddReflectionInput,
  type AddReflectionValidationIssue,
} from '../models/addReflection';
import type { CarryRepository, CarryRepositoryResult } from '../repositories/CarryRepository';

export type SaveCarryReflectionDraft = Omit<AddReflectionInput, 'id'>;

export interface SaveCarryReflectionContext {
  readonly carryRepository: CarryRepository;
  readonly carryId: string;
  readonly reflectionId: string;
  readonly now: () => Date;
}

export type SaveCarryReflectionResult =
  | { readonly ok: true; readonly carry: Carry }
  | {
      readonly ok: false;
      readonly code: 'validation';
      readonly issues: readonly AddReflectionValidationIssue[];
    }
  | {
      readonly ok: false;
      readonly code: 'not_found' | 'not_ready' | 'already_reflected' | 'unavailable';
    };

/** Validate against the stored Carry before asking the repository to commit one reflection. */
export async function saveCarryReflection(
  draft: SaveCarryReflectionDraft,
  context: SaveCarryReflectionContext,
): Promise<SaveCarryReflectionResult> {
  let current: CarryRepositoryResult<Carry | null>;
  try {
    current = await context.carryRepository.findById(context.carryId);
  } catch {
    return { ok: false, code: 'unavailable' };
  }

  if (!current.ok) return { ok: false, code: 'unavailable' };
  if (current.value === null) return { ok: false, code: 'not_found' };
  if (current.value.reflection) return { ok: false, code: 'already_reflected' };

  let prepared;
  try {
    prepared = addReflection(current.value, { ...draft, id: context.reflectionId }, context.now());
  } catch {
    return { ok: false, code: 'unavailable' };
  }

  if (!prepared.ok) {
    if (
      prepared.issues.some(
        (issue) => issue.field === 'createdAt' && issue.code === 'before_scheduled_time',
      )
    ) {
      return { ok: false, code: 'not_ready' };
    }
    return { ok: false, code: 'validation', issues: prepared.issues };
  }

  const reflection = prepared.carry.reflection;
  if (!reflection) return { ok: false, code: 'unavailable' };

  let stored: CarryRepositoryResult<Carry | null>;
  try {
    stored = await context.carryRepository.recordReflection(
      context.carryId,
      reflection,
      context.now,
    );
  } catch {
    return { ok: false, code: 'unavailable' };
  }

  if (!stored.ok) {
    if (stored.code === 'not_ready' || stored.code === 'already_reflected') {
      return { ok: false, code: stored.code };
    }
    return { ok: false, code: 'unavailable' };
  }
  if (stored.value === null) return { ok: false, code: 'not_found' };
  return { ok: true, carry: stored.value };
}
