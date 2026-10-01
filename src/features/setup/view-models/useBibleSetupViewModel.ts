import { useEffect, useState } from 'react';

import type {
  BibleRepository,
  BibleRepositoryResult,
} from '../../../application/ports/BibleRepository';

type BibleSetupState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly bookCount: number;
      readonly reference: string;
      readonly text: string;
    };

type LoadBible = () => Promise<BibleRepositoryResult<BibleRepository>>;

export function useBibleSetupViewModel(loadBible: LoadBible): BibleSetupState {
  const [state, setState] = useState<BibleSetupState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    async function loadPreview(): Promise<void> {
      try {
        const repository = await loadBible();
        if (!repository.ok) {
          if (active) setState({ status: 'error' });
          return;
        }

        const books = await repository.value.getBooks();
        const passage = await repository.value.getPassage({
          startVerseKey: 'JAS.1.19',
          endVerseKey: 'JAS.1.20',
        });

        if (!active) return;
        if (!books.ok || !passage.ok) {
          setState({ status: 'error' });
          return;
        }

        setState({
          status: 'ready',
          bookCount: books.value.length,
          reference: passage.value.reference,
          text: passage.value.verses
            .map((verse) => verse.text)
            .filter(Boolean)
            .join(' '),
        });
      } catch {
        if (active) setState({ status: 'error' });
      }
    }

    void loadPreview();
    return () => {
      active = false;
    };
  }, [loadBible]);

  return state;
}
