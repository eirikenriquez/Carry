import type { CarryRepository } from '../ports/CarryRepository';
import type { NotificationService } from '../ports/NotificationService';

export type DeleteUpcomingCarryResult =
  | {
      readonly ok: true;
      readonly reminderStatus: 'not_needed' | 'cancelled' | 'cancel_failed';
    }
  | { readonly ok: false; readonly code: 'not_upcoming' | 'unavailable' };

/** Delete a Carry only while its stored state is still upcoming. */
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
