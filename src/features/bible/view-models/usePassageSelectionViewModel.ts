import { useCallback, useEffect, useState } from 'react';

import type { BibleRepository } from '../../../application/ports/BibleRepository';
import type { BiblePassage } from '../../../domain/entities/BiblePassage';
import type { BibleVerse } from '../../../domain/entities/BibleVerse';
import type { PassageSelection } from '../../../domain/entities/PassageSelection';
import type { BibleLoadState } from './BibleLoadState';

type PassageSelectionViewModel = {
  readonly selection: PassageSelection | null;
  readonly preview: BibleLoadState<BiblePassage> | null;
  readonly selectVerse: (verse: BibleVerse) => void;
  readonly clearSelection: () => void;
  readonly retryPreview: () => void;
};

type SelectionRecord = {
  readonly selection: PassageSelection;
  readonly anchorVerseNumber: number;
  readonly completed: boolean;
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
  readonly state: BibleLoadState<BiblePassage>;
};

const loadingState: BibleLoadState<BiblePassage> = { status: 'loading' };

export function usePassageSelectionViewModel(
  repository: BibleRepository,
  bookId: string,
  chapter: number,
): PassageSelectionViewModel {
  const [selectionState, setSelectionState] = useState<SelectionState>(() => ({
    repository,
    bookId,
    chapter,
    record: null,
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
  const preview =
    activeSelectionRecord === null
      ? null
      : previewRecord?.selectionRecord === activeSelectionRecord &&
          previewRecord.attempt === attempt
        ? previewRecord.state
        : loadingState;

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

  const selectVerse = useCallback(
    (verse: BibleVerse): void => {
      if (verse.bookId !== bookId || verse.chapter !== chapter) return;

      let nextSelection: PassageSelection;
      let anchorVerseNumber: number;
      let completed: boolean;

      if (activeSelectionRecord === null || activeSelectionRecord.completed) {
        nextSelection = { startVerseKey: verse.key, endVerseKey: verse.key };
        anchorVerseNumber = verse.verse;
        completed = false;
      } else {
        const anchorVerseKey = activeSelectionRecord.selection.startVerseKey;
        nextSelection =
          verse.verse < activeSelectionRecord.anchorVerseNumber
            ? { startVerseKey: verse.key, endVerseKey: anchorVerseKey }
            : { startVerseKey: anchorVerseKey, endVerseKey: verse.key };
        anchorVerseNumber = activeSelectionRecord.anchorVerseNumber;
        completed = true;
      }

      setSelectionState({
        repository,
        bookId,
        chapter,
        record: {
          selection: nextSelection,
          anchorVerseNumber,
          completed,
        },
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
