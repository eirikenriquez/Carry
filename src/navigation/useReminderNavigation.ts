/**
 * Handles notification taps that should open a Carry.
 * Waits until navigation is ready before opening the detail screen.
 */
import { useEffect, useRef, useState } from 'react';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import type { AppRoutes } from './AppNavigator';

interface PendingReminderRoute {
  readonly carryId: string;
  readonly responseId: string;
}

export function useReminderNavigation(
  navigationRef: NavigationContainerRefWithCurrent<AppRoutes>,
  navigationReady: boolean,
): void {
  const [pendingRoute, setPendingRoute] = useState<PendingReminderRoute | null>(null);
  const handledResponseIds = useRef(new Set<string>());
  const consumedResponseId = useRef<string | null>(null);
  const warmResponseReceived = useRef(false);

  useEffect(() => {
    function handleResponse(
      response: Notifications.NotificationResponse | null,
      source: 'cold' | 'warm',
    ): void {
      if (source === 'warm') {
        warmResponseReceived.current = true;
      } else if (warmResponseReceived.current) {
        return;
      }

      if (!response) return;

      const responseId = response.notification?.request?.identifier;
      if (typeof responseId !== 'string' || responseId.length === 0) return;
      if (handledResponseIds.current.has(responseId)) return;

      const carryId = getCarryId(response);
      if (!carryId) return;

      handledResponseIds.current.add(responseId);
      setPendingRoute({ carryId, responseId });
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      handleResponse(response, 'warm'),
    );
    // The listener is active first so a newer warm tap takes precedence over a stale launch response.
    try {
      handleResponse(Notifications.getLastNotificationResponse(), 'cold');
    } catch {
      // Some native environments can return an unavailable or malformed launch response.
    }

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (
      !navigationReady ||
      !navigationRef.isReady() ||
      !pendingRoute ||
      consumedResponseId.current === pendingRoute.responseId
    ) {
      return;
    }

    consumedResponseId.current = pendingRoute.responseId;
    navigationRef.navigate('CarryDetail', { carryId: pendingRoute.carryId });
    clearLastResponseSafely();
  }, [navigationReady, navigationRef, pendingRoute]);
}

/** Accept only the normal notification tap and its Carry ID payload. */
function getCarryId(response: Notifications.NotificationResponse): string | null {
  if (response?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return null;
  }

  const carryId = response.notification?.request?.content?.data?.carryId;
  return typeof carryId === 'string' && carryId.trim().length > 0 ? carryId : null;
}

/** Clear native launch state without letting platform errors interrupt navigation. */
function clearLastResponseSafely(): void {
  try {
    Notifications.clearLastNotificationResponse();
  } catch {
    // A notification routing failure must not interrupt app startup.
  }
}
