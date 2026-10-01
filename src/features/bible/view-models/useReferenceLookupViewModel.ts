import { useCallback, useEffect, useRef, useState } from 'react';

import type { BibleRepository } from '../../../application/ports/BibleRepository';
import {
  resolveBibleReference,
  type ReferenceTarget,
} from '../../../application/services/resolveBibleReference';
import type { BibleBook } from '../../../domain/entities/BibleBook';

const messages = {
  invalid_format: 'Enter a full book name and reference, such as John 3:16 or James 1:19–20.',
  unknown_book: 'Book not found. Use its full name from the list below.',
  invalid_selection: 'That chapter or verse range is invalid. Check the numbers and range order.',
  unavailable: 'The Bible data could not be read. Please try again.',
};

export function useReferenceLookupViewModel(
  repository: BibleRepository,
  books: readonly BibleBook[],
) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const request = useRef(0);
  const busy = useRef(false);

  useEffect(
    () => () => {
      request.current += 1;
      busy.current = false;
    },
    [repository, books],
  );

  const changeQuery = useCallback((value: string): void => {
    // Editing invalidates the old request so its result cannot open another passage.
    request.current += 1;
    busy.current = false;
    setQuery(value);
    setError(null);
    setIsLoading(false);
  }, []);

  const lookup = useCallback(async (): Promise<ReferenceTarget | null> => {
    if (busy.current) return null;
    busy.current = true;
    const currentRequest = ++request.current;
    setIsLoading(true);
    setError(null);

    const result = await resolveBibleReference(query, books, repository);
    if (currentRequest !== request.current) return null;

    busy.current = false;
    setIsLoading(false);
    if (!result.ok) {
      setError(messages[result.code]);
      return null;
    }
    return result.value;
  }, [query, books, repository]);

  return { query, changeQuery, error, isLoading, lookup };
}
