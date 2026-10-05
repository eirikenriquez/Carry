/**
 * Updates an upcoming Carry after validating its draft and Bible passage.
 * It preserves stored lifecycle metadata and synchronizes the reminder after the write.
 */
import type { Carry } from '../models/Carry';
import { getCarryStatus } from '../models/getCarryStatus';
import type { BibleRepository } from '../repositories/BibleRepository';
import type { CarryRepository, CarryRepositoryResult } from '../repositories/CarryRepository';
import type { NotificationService } from './NotificationService';
import {
  prepareCarryDraft,
  type CarryRecordDraft,
  type CarryRecordValidationIssue,
} from './prepareCarryDraft';
import { syncCarryReminder, type ReminderSyncStatus } from './syncCarryReminder';

export interface UpdateCarryRecordContext {
  readonly bibleRepository: BibleRepository;
  readonly carryRepository: CarryRepository;
  readonly notifications: NotificationService;
  readonly carryId: string;
  readonly categoryId: string;
  readonly now: () => Date;
}

export type UpdateCarryRecordResult =
  | { readonly ok: true; readonly carry: Carry; readonly reminderStatus: ReminderSyncStatus }
  | {
      readonly ok: false;
      readonly code: 'validation';
      readonly issues: readonly CarryRecordValidationIssue[];
    }
  | { readonly ok: false; readonly code: 'not_found' }
  | { readonly ok: false; readonly code: 'not_upcoming' }
  | { readonly ok: false; readonly code: 'unavailable'; readonly source: 'bible' | 'storage' };

export async function updateCarryRecord(
  draft: CarryRecordDraft,
  context: UpdateCarryRecordContext,
): Promise<UpdateCarryRecordResult> {
  let originalResult: CarryRepositoryResult<Carry | null>;
  try {
    originalResult = await context.carryRepository.findById(context.carryId);
  } catch {
    return { ok: false, code: 'unavailable', source: 'storage' };
  }

  if (!originalResult.ok) return { ok: false, code: 'unavailable', source: 'storage' };
  if (originalResult.value === null) return { ok: false, code: 'not_found' };

  const initialNow = context.now();
  if (getCarryStatus(originalResult.value, initialNow) !== 'upcoming') {
    return { ok: false, code: 'not_upcoming' };
  }

  const prepared = prepareCarryDraft(draft, context, initialNow);
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

  let latestResult: CarryRepositoryResult<Carry | null>;
  try {
    latestResult = await context.carryRepository.findById(context.carryId);
  } catch {
    return { ok: false, code: 'unavailable', source: 'storage' };
  }

  if (!latestResult.ok) return { ok: false, code: 'unavailable', source: 'storage' };
  if (latestResult.value === null) return { ok: false, code: 'not_found' };

  const writeTime = context.now();
  if (getCarryStatus(latestResult.value, writeTime) !== 'upcoming') {
    return { ok: false, code: 'not_upcoming' };
  }

  const revalidated = prepareCarryDraft(draft, context, writeTime);
  if (!revalidated.ok) {
    return { ok: false, code: 'validation', issues: revalidated.issues };
  }

  const carry = preserveOriginalMetadata(revalidated.carry, latestResult.value);
  try {
    const stored = await context.carryRepository.update(revalidated.category, carry, context.now);
    if (!stored.ok) {
      if (stored.code === 'not_upcoming') return { ok: false, code: 'not_upcoming' };
      if (
        stored.code === 'invalid_record' &&
        carry.scheduledAt.getTime() <= context.now().getTime()
      ) {
        return {
          ok: false,
          code: 'validation',
          issues: [{ field: 'scheduledAt', code: 'must_be_future' }],
        };
      }
      return { ok: false, code: 'unavailable', source: 'storage' };
    }
    if (stored.value === null) return { ok: false, code: 'not_found' };
    const reminder = await syncCarryReminder(
      stored.value,
      context.carryRepository,
      context.notifications,
      context.now,
    );
    return { ok: true, carry: reminder.carry, reminderStatus: reminder.status };
  } catch {
    return { ok: false, code: 'unavailable', source: 'storage' };
  }
}

/** Keep identity and lifecycle data when the factory validates edited fields. */
function preserveOriginalMetadata(updated: Carry, original: Carry): Carry {
  return {
    ...updated,
    id: original.id,
    createdAt: original.createdAt,
    ...(original.reminderId === undefined ? {} : { reminderId: original.reminderId }),
    ...(original.reflection === undefined ? {} : { reflection: original.reflection }),
  };
}
