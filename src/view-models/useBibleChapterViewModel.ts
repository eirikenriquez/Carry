/**
 * This hook loads verses for the current Bible chapter.
 * It exposes loading status and a retry action.
 */
import { useCallback, useEffect, useState } from 'react';

import type { BibleRepository } from '../repositories/BibleRepository';
import type { BibleVerse } from '../models/BibleVerse';
import type { LoadState } from './LoadState';

type BibleChapterViewModel = {
  readonly state: LoadState<readonly BibleVerse[]>;
  readonly retry: () => void;
};

type ChapterStateRecord = {
  readonly repository: BibleRepository;
  readonly bookId: string;
  readonly chapter: number;
  readonly state: LoadState<readonly BibleVerse[]>;
};

const loadingState: LoadState<readonly BibleVerse[]> = { status: 'loading' };

/**
 * Load the current chapter, expose retry, and ignore outdated responses.
 */
export function useBibleChapterViewModel(
  repository: BibleRepository,
  bookId: string,
  chapter: number,
): BibleChapterViewModel {
  const [record, setRecord] = useState<ChapterStateRecord>(() => ({
    repository,
    bookId,
    chapter,
    state: loadingState,
  }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const request = { repository, bookId, chapter };

    async function loadChapter(): Promise<void> {
      try {
        const result = await repository.getChapter(bookId, chapter);
        if (!active) return;
        if (!result.ok || result.value.length === 0) {
          setRecord({ ...request, state: { status: 'error' } });
          return;
        }

        setRecord({ ...request, state: { status: 'ready', data: result.value } });
      } catch {
        if (active) setRecord({ ...request, state: { status: 'error' } });
      }
    }

    void loadChapter();

    return () => {
      active = false;
    };
  }, [repository, bookId, chapter, attempt]);

  const retry = useCallback((): void => {
    setRecord({ repository, bookId, chapter, state: loadingState });
    setAttempt((current) => current + 1);
  }, [repository, bookId, chapter]);

  // A scope change shows loading instead of another chapter's cached result.
  const state =
    record.repository === repository && record.bookId === bookId && record.chapter === chapter
      ? record.state
      : loadingState;

  return { state, retry };
}
