import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { NotificationService } from '../../application/ports/NotificationService';

const REMINDER_CHANNEL_ID = 'carry-reminders';
let presentationConfigured = false;

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Carry reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Install the foreground presentation policy once during app startup. */
export function configureNotificationPresentation(): void {
  if (presentationConfigured) {
    return;
  }

  presentationConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export class ExpoNotificationService implements NotificationService {
  /** Create Android's channel before checking or requesting notification access. */
  async requestPermission(): Promise<boolean> {
    await ensureAndroidChannel();

    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      return true;
    }
    if (!current.canAskAgain) {
      return false;
    }

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  }

  async schedule(carryId: string, reminderAt: Date): Promise<string> {
    await ensureAndroidChannel();

    return Notifications.scheduleNotificationAsync({
      content: {
        title: 'Carry reminder',
        body: "It's time to revisit your Carry.",
        data: { carryId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderAt,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  }

  async cancel(reminderId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(reminderId);
  }
}
