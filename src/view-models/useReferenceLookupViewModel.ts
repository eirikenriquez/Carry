import { useCallback, useEffect, useRef, useState } from 'react';

import type { BibleRepository } from '../repositories/BibleRepository';
import { resolveBibleReference, type ReferenceTarget } from '../services/resolveBibleReference';
import type { BibleBook } from '../models/BibleBook';

type ReferenceLookupViewModel = {
  readonly query: string;
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly changeQuery: (value: string) => void;
  readonly cancelLookup: () => void;
  readonly lookup: () => Promise<ReferenceTarget | null>;
};

const messages = {
  invalid_format: 'Enter a full book name and reference, such as John 3:16 or James 1:19–20.',
  unknown_book: 'Book not found. Use its full name from the list below.',
  invalid_selection: 'That chapter or verse range is invalid. Check the numbers and range order.',
  unavailable: 'The Bible data could not be read. Please try again.',
};

/**
 * Manage reference input, feedback, and cancellation of outdated lookups.
 */
export function useReferenceLookupViewModel(
  repository: BibleRepository,
  books: readonly BibleBook[],
): ReferenceLookupViewModel {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lookupScope, setLookupScope] = useState({ repository, books });

  // Reset feedback before rendering a changed reader or catalogue; keep the query.
  if (lookupScope.repository !== repository || lookupScope.books !== books) {
    setLookupScope({ repository, books });
    setError(null);
    setIsLoading(false);
  }

  // Only the latest request ID may publish a result.
  const requestId = useRef(0);
  // State updates are deferred; this ref blocks a second submit immediately.
  const requestInFlight = useRef(false);

  /**
   * Invalidate pending lookup results and clear feedback without changing the input.
   */
  const cancelLookup = useCallback((): void => {
    requestId.current += 1;
    requestInFlight.current = false;
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      requestId.current += 1;
      requestInFlight.current = false;
    };
  }, [repository, books]);

  const changeQuery = useCallback(
    (value: string): void => {
      cancelLookup();
      setQuery(value);
    },
    [cancelLookup],
  );

  /**
   * Return a validated navigation target only while this lookup is still current.
   */
  const lookup = useCallback(async (): Promise<ReferenceTarget | null> => {
    if (requestInFlight.current) return null;
    requestInFlight.current = true;
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setError(null);

    const result = await resolveBibleReference(query, books, repository);
    if (currentRequestId !== requestId.current) return null;

    requestInFlight.current = false;
    setIsLoading(false);
    if (!result.ok) {
      setError(messages[result.code]);
      return null;
    }
    return result.value;
  }, [query, books, repository]);

  return { query, changeQuery, error, isLoading, cancelLookup, lookup };
}
