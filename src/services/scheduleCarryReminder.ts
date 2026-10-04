import type { Carry } from '../models/Carry';
import type { CarryRepository } from '../repositories/CarryRepository';
import type { NotificationService } from './NotificationService';

export type ScheduleCarryReminderResult =
  | { readonly status: 'scheduled'; readonly reminderId: string }
  | {
      readonly status: 'too_late' | 'permission_denied' | 'failed' | 'cleanup_failed';
    };

/** Schedule a saved Carry's reminder and compensate if its ID cannot be persisted. */
export async function scheduleCarryReminder(
  carry: Carry,
  repository: CarryRepository,
  notifications: NotificationService,
  now: () => Date,
): Promise<ScheduleCarryReminderResult> {
  const reminderAt = new Date(carry.scheduledAt.getTime() - 15 * 60 * 1000);

  try {
    const currentTime = now().getTime();
    if (!Number.isFinite(reminderAt.getTime()) || !Number.isFinite(currentTime)) {
      return { status: 'failed' };
    }
    if (reminderAt.getTime() <= currentTime) {
      return { status: 'too_late' };
    }

    if (!(await notifications.requestPermission())) {
      return { status: 'permission_denied' };
    }

    // Permission prompts can take long enough that a useful reminder is no longer possible.
    const currentTimeAfterPermission = now().getTime();
    if (!Number.isFinite(currentTimeAfterPermission)) return { status: 'failed' };
    if (reminderAt.getTime() <= currentTimeAfterPermission) return { status: 'too_late' };

    const reminderId = await notifications.schedule(carry.id, reminderAt);
    let linked = false;
    try {
      const stored = await repository.setReminderId(carry.id, reminderId);
      linked = stored.ok && stored.value;
    } catch {
      // A thrown write is still a failed link and must not leave a known orphan behind.
    }
    if (linked) return { status: 'scheduled', reminderId };

    try {
      await notifications.cancel(reminderId);
      return { status: 'failed' };
    } catch {
      return { status: 'cleanup_failed' };
    }
  } catch {
    return { status: 'failed' };
  }
}
