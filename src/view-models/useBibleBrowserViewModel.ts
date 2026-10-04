import { useCallback, useEffect, useRef, useState } from 'react';

import type { BibleRepository, BibleRepositoryResult } from '../repositories/BibleRepository';
import type { BibleBook } from '../models/BibleBook';
import type { BibleLoadState } from './BibleLoadState';

type BibleBrowserData = {
  readonly repository: BibleRepository;
  readonly books: readonly BibleBook[];
};

type LoadBible = () => Promise<BibleRepositoryResult<BibleRepository>>;

type BibleBrowserViewModel = {
  readonly state: BibleLoadState<BibleBrowserData>;
  readonly retry: () => void;
};

/**
 * Load the book catalogue and reuse the opened repository when retrying.
 */
export function useBibleBrowserViewModel(loadBible: LoadBible): BibleBrowserViewModel {
  const [state, setState] = useState<BibleLoadState<BibleBrowserData>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const repositoryRef = useRef<BibleRepository | null>(null);
  const openingRef = useRef<Promise<BibleRepositoryResult<BibleRepository>> | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBooks(): Promise<void> {
      try {
        let repository = repositoryRef.current;

        if (repository === null) {
          // Strict Mode can restart this effect before its first open settles.
          let opening = openingRef.current;
          if (opening === null) {
            opening = loadBible();
            openingRef.current = opening;
          }

          let result: BibleRepositoryResult<BibleRepository>;
          try {
            result = await opening;
          } finally {
            if (openingRef.current === opening) openingRef.current = null;
          }

          if (!active) return;
          if (!result.ok) {
            setState({ status: 'error' });
            return;
          }

          repository = result.value;
          repositoryRef.current = repository;
        }

        const books = await repository.getBooks();
        if (!active) return;
        if (!books.ok || books.value.length === 0) {
          setState({ status: 'error' });
          return;
        }

        setState({ status: 'ready', data: { repository, books: books.value } });
      } catch {
        if (active) setState({ status: 'error' });
      }
    }

    void loadBooks();

    return () => {
      active = false;
    };
  }, [loadBible, attempt]);

  const retry = useCallback((): void => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  return { state, retry };
}
