import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { CarryLoadState } from './CarryLoadState';

/** Refresh derived status time on focus, after loading, and when the app resumes. */
export function useCarryStatusClock(isFocused: boolean, loadState: CarryLoadState<unknown>): Date {
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
