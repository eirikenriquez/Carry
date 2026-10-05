/**
 * This hook provides the current time for Carry status displays.
 * It refreshes when focus, loaded data, or app activity changes.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { LoadState } from './LoadState';

export function useCarryStatusClock(isFocused: boolean, loadState: LoadState<unknown>): Date {
  const [clock, setClock] = useState(() => ({ isFocused, loadState, now: new Date() }));

  // Refresh before rendering when the focused screen or its loaded data changes.
  if (clock.isFocused !== isFocused || clock.loadState !== loadState) {
    setClock({ isFocused, loadState, now: new Date() });
  }

  useEffect(() => {
    if (!isFocused) return undefined;

    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') {
        setClock((current) => ({ ...current, now: new Date() }));
      }
    });

    return () => subscription.remove();
  }, [isFocused]);

  return clock.now;
}
