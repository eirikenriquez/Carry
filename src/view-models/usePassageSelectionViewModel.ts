/**
 * This hook tracks verse taps within one chapter.
 * It loads a preview for the selected passage.
 */
import { useCallback, useEffect, useState } from 'react';

import type { BibleRepository } from '../repositories/BibleRepository';
import type { BiblePassage } from '../models/BiblePassage';
import type { BibleVerse } from '../models/BibleVerse';
import type { PassageSelection } from '../models/PassageSelection';
import type { LoadState } from './LoadState';

type PassageSelectionViewModel = {
  readonly selection: PassageSelection | null;
  readonly preview: LoadState<BiblePassage> | null;
  readonly selectVerse: (verse: BibleVerse) => void;
  readonly clearSelection: () => void;
  readonly retryPreview: () => void;
};

type SelectionRecord =
  | {
      readonly phase: 'awaitingEnd';
      readonly selection: PassageSelection;
      readonly anchorVerseNumber: number;
    }
  | {
      readonly phase: 'complete';
      readonly selection: PassageSelection;
    };

type SelectionState = {
  readonly repository: BibleRepository;
  readonly bookId: string;
  readonly chapter: number;
  readonly record: SelectionRecord | null;
};

type PreviewRecord = {
  readonly selectionRecord: SelectionRecord;
  readonly attempt: number;
  readonly state: LoadState<BiblePassage>;
};

const loadingState: LoadState<BiblePassage> = { status: 'loading' };

export function usePassageSelectionViewModel(
  repository: BibleRepository,
  bookId: string,
  chapter: number,
  initialSelection?: PassageSelection,
): PassageSelectionViewModel {
  const [selectionState, setSelectionState] = useState<SelectionState>(() => ({
    repository,
    bookId,
    chapter,
    // A lookup selection is already complete; the next tap starts over.
    record: initialSelection ? { selection: initialSelection, phase: 'complete' } : null,
  }));
  const [previewRecord, setPreviewRecord] = useState<PreviewRecord | null>(null);
  const [attempt, setAttempt] = useState(0);

  const sameScope =
    selectionState.repository === repository &&
    selectionState.bookId === bookId &&
    selectionState.chapter === chapter;

  // Reset during render so A -> B -> A cannot revive a choice from the first A.
  if (!sameScope) {
    setSelectionState({ repository, bookId, chapter, record: null });
  }

  const activeSelectionRecord = sameScope ? selectionState.record : null;
  const selection = activeSelectionRecord?.selection ?? null;
  // Show results only for the current selection and retry attempt.
  let preview: LoadState<BiblePassage> | null = null;
  if (activeSelectionRecord !== null) {
    preview = loadingState;
    if (
      previewRecord?.selectionRecord === activeSelectionRecord &&
      previewRecord.attempt === attempt
    ) {
      preview = previewRecord.state;
    }
  }

  useEffect(() => {
    if (activeSelectionRecord === null) return undefined;

    let active = true;
    const requestRecord = activeSelectionRecord;
    const requestAttempt = attempt;

    async function loadPreview(): Promise<void> {
      try {
        const result = await repository.getPassage(requestRecord.selection);
        if (!active) return;

        setPreviewRecord({
          selectionRecord: requestRecord,
          attempt: requestAttempt,
          state: result.ok ? { status: 'ready', data: result.value } : { status: 'error' },
        });
      } catch {
        if (active) {
          setPreviewRecord({
            selectionRecord: requestRecord,
            attempt: requestAttempt,
            state: { status: 'error' },
          });
        }
      }
    }

    void loadPreview();

    return () => {
      active = false;
    };
  }, [activeSelectionRecord, attempt, repository]);

  /**
   * Start a selection or complete its range using numeric verse order.
   */
  const selectVerse = useCallback(
    (verse: BibleVerse): void => {
      if (verse.bookId !== bookId || verse.chapter !== chapter) return;

      let record: SelectionRecord;

      if (activeSelectionRecord === null || activeSelectionRecord.phase === 'complete') {
        record = {
          phase: 'awaitingEnd',
          selection: { startVerseKey: verse.key, endVerseKey: verse.key },
          anchorVerseNumber: verse.verse,
        };
      } else {
        const anchorVerseKey = activeSelectionRecord.selection.startVerseKey;
        const selection =
          verse.verse < activeSelectionRecord.anchorVerseNumber
            ? { startVerseKey: verse.key, endVerseKey: anchorVerseKey }
            : { startVerseKey: anchorVerseKey, endVerseKey: verse.key };
        record = { phase: 'complete', selection };
      }

      setSelectionState({
        repository,
        bookId,
        chapter,
        record,
      });
    },
    [activeSelectionRecord, bookId, chapter, repository],
  );

  const clearSelection = useCallback((): void => {
    setSelectionState({ repository, bookId, chapter, record: null });
  }, [bookId, chapter, repository]);

  const retryPreview = useCallback((): void => {
    if (activeSelectionRecord === null) return;
    setAttempt((current) => current + 1);
  }, [activeSelectionRecord]);

  return { selection, preview, selectVerse, clearSelection, retryPreview };
}
