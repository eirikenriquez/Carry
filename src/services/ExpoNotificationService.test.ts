import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  ExpoNotificationService,
  configureNotificationPresentation,
} from './ExpoNotificationService';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

describe('ExpoNotificationService', () => {
  const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
  const service = new ExpoNotificationService();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  });

  afterAll(() => {
    if (originalPlatformDescriptor) {
      Object.defineProperty(Platform, 'OS', originalPlatformDescriptor);
    }
  });

  it('creates the Android channel before checking and requesting permission', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: true,
      status: 'undetermined',
      expires: 'never',
    } as Notifications.NotificationPermissionsStatus);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: 'granted',
      expires: 'never',
    } as Notifications.NotificationPermissionsStatus);

    await expect(service.requestPermission()).resolves.toBe(true);

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'carry-reminders',
      expect.objectContaining({ name: 'Carry reminders' }),
    );
    expect(
      jest.mocked(Notifications.setNotificationChannelAsync).mock.invocationCallOrder[0],
    ).toBeLessThan(jest.mocked(Notifications.getPermissionsAsync).mock.invocationCallOrder[0]);
    expect(jest.mocked(Notifications.getPermissionsAsync).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(Notifications.requestPermissionsAsync).mock.invocationCallOrder[0],
    );
  });

  it('returns false without prompting when permission cannot be requested again', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: false,
      status: 'denied',
      expires: 'never',
    } as Notifications.NotificationPermissionsStatus);

    await expect(service.requestPermission()).resolves.toBe(false);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('schedules generic DATE content with the Carry ID and can cancel its returned ID', async () => {
    const reminderAt = new Date('2026-10-05T09:30:00.000Z');
    jest.mocked(Notifications.scheduleNotificationAsync).mockResolvedValue('notification-123');

    await expect(service.schedule('carry-123', reminderAt)).resolves.toBe('notification-123');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Carry reminder',
        body: "It's time to revisit your Carry.",
        data: { carryId: 'carry-123' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderAt,
        channelId: 'carry-reminders',
      },
    });

    await service.cancel('notification-123');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-123');
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('notification-123');
  });

  it('configures foreground presentation only once', () => {
    configureNotificationPresentation();
    configureNotificationPresentation();

    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });
});
