/**
 * Refreshes a saved Carry's reminder after an edit.
 * It keeps storage authoritative while reporting cancellation, unlinking, and scheduling outcomes.
 */
import type { Carry } from '../models/Carry';
import type { CarryRepository } from '../repositories/CarryRepository';
import type { NotificationService } from './NotificationService';
import { scheduleCarryReminder, type ScheduleCarryReminderResult } from './scheduleCarryReminder';

export type ReminderSyncStatus =
  ScheduleCarryReminderResult['status'] | 'cancel_failed' | 'unlink_failed';

export interface SyncCarryReminderResult {
  readonly carry: Carry;
  readonly status: ReminderSyncStatus;
}

export async function syncCarryReminder(
  updated: Carry,
  repository: CarryRepository,
  notifications: NotificationService,
  now: () => Date,
): Promise<SyncCarryReminderResult> {
  if (updated.reminderId) {
    try {
      await notifications.cancel(updated.reminderId);
    } catch {
      return { carry: updated, status: 'cancel_failed' };
    }

    try {
      const cleared = await repository.setReminderId(updated.id, null);
      if (!cleared.ok || !cleared.value) return { carry: updated, status: 'unlink_failed' };
    } catch {
      return { carry: updated, status: 'unlink_failed' };
    }
  }

  const withoutReminder = { ...updated, reminderId: undefined };
  let scheduled: ScheduleCarryReminderResult;
  try {
    scheduled = await scheduleCarryReminder(withoutReminder, repository, notifications, now);
  } catch {
    return { carry: withoutReminder, status: 'failed' };
  }

  return scheduled.status === 'scheduled'
    ? {
        carry: { ...withoutReminder, reminderId: scheduled.reminderId },
        status: scheduled.status,
      }
    : { carry: withoutReminder, status: scheduled.status };
}
