/**
 * This hook loads a selected Bible passage for a form.
 * It exposes the passage load state and a retry action.
 */
import { useCallback, useEffect, useState } from 'react';

import type { BibleRepository } from '../repositories/BibleRepository';
import type { BiblePassage } from '../models/BiblePassage';
import type { PassageSelection } from '../models/PassageSelection';
import type { LoadState } from './LoadState';

interface UsePassagePreviewOptions {
  readonly bibleRepository: BibleRepository;
  readonly selection: PassageSelection | null;
}

interface PassagePreview {
  readonly state: LoadState<BiblePassage>;
  readonly retry: () => void;
}

/** Load the selected passage and hide results for an older selection or retry. */
export function usePassagePreview({
  bibleRepository,
  selection,
}: UsePassagePreviewOptions): PassagePreview {
  const [attempt, setAttempt] = useState(0);
  const [record, setRecord] = useState<{
    readonly startVerseKey: string;
    readonly endVerseKey: string;
    readonly attempt: number;
    readonly state: LoadState<BiblePassage>;
  } | null>(null);

  const startVerseKey = selection?.startVerseKey ?? null;
  const endVerseKey = selection?.endVerseKey ?? null;

  useEffect(() => {
    if (startVerseKey === null || endVerseKey === null) return;

    let active = true;
    const selectedStartVerseKey = startVerseKey;
    const selectedEndVerseKey = endVerseKey;

    async function loadPassage(): Promise<void> {
      try {
        const result = await bibleRepository.getPassage({
          startVerseKey: selectedStartVerseKey,
          endVerseKey: selectedEndVerseKey,
        });
        if (!active) return;
        setRecord({
          startVerseKey: selectedStartVerseKey,
          endVerseKey: selectedEndVerseKey,
          attempt,
          state: result.ok ? { status: 'ready', data: result.value } : { status: 'error' },
        });
      } catch {
        if (active) {
          setRecord({
            startVerseKey: selectedStartVerseKey,
            endVerseKey: selectedEndVerseKey,
            attempt,
            state: { status: 'error' },
          });
        }
      }
    }

    void loadPassage();
    return () => {
      // Ignore a late read after selection changes, retry, or unmount.
      active = false;
    };
  }, [bibleRepository, startVerseKey, endVerseKey, attempt]);

  const retry = useCallback((): void => {
    setAttempt((current) => current + 1);
  }, []);

  const state: LoadState<BiblePassage> =
    record !== null &&
    record.startVerseKey === startVerseKey &&
    record.endVerseKey === endVerseKey &&
    record.attempt === attempt
      ? record.state
      : { status: 'loading' };

  return { state, retry };
}
