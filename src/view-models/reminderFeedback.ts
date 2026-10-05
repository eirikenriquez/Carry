/**
 * This function maps reminder sync outcomes to user-facing messages.
 * Create and edit flows use the same wording.
 */
import type { ReminderSyncStatus } from '../services/syncCarryReminder';

export function reminderFeedback(status: ReminderSyncStatus): string {
  switch (status) {
    case 'scheduled':
      return 'Reminder scheduled 15 minutes before your Carry.';
    case 'too_late':
      return 'Carry saved. It is too close to its time for a 15-minute reminder.';
    case 'permission_denied':
      return 'Carry saved. Reminders are disabled because notification permission is off.';
    case 'failed':
      return 'Carry saved, but its reminder could not be scheduled.';
    case 'cleanup_failed':
      return 'Carry saved, but a reminder could not be linked or cancelled. It may still appear.';
    case 'cancel_failed':
      return 'Carry saved, but its old reminder could not be cancelled. It may still appear.';
    case 'unlink_failed':
      return 'Carry saved, but its cancelled reminder could not be unlinked.';
  }
}
