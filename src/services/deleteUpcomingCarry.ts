/**
 * Deletes an upcoming Carry and reports the outcome of canceling its linked reminder.
 * It relies on the repository to enforce the record's current lifecycle state.
 */
import type { CarryRepository } from '../repositories/CarryRepository';
import type { NotificationService } from './NotificationService';

export type DeleteUpcomingCarryResult =
  | {
      readonly ok: true;
      readonly reminderStatus: 'not_needed' | 'cancelled' | 'cancel_failed';
    }
  | { readonly ok: false; readonly code: 'not_upcoming' | 'unavailable' };

export async function deleteUpcomingCarry(
  carryId: string,
  repository: CarryRepository,
  notifications: NotificationService,
  now: () => Date = () => new Date(),
): Promise<DeleteUpcomingCarryResult> {
  let result;
  try {
    result = await repository.delete(carryId, now);
  } catch {
    return { ok: false, code: 'unavailable' };
  }

  if (!result.ok) {
    return result.code === 'not_upcoming'
      ? { ok: false, code: 'not_upcoming' }
      : { ok: false, code: 'unavailable' };
  }
  if (!result.value?.reminderId) return { ok: true, reminderStatus: 'not_needed' };

  try {
    await notifications.cancel(result.value.reminderId);
    return { ok: true, reminderStatus: 'cancelled' };
  } catch {
    return { ok: true, reminderStatus: 'cancel_failed' };
  }
}
