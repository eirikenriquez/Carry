/**
 * Renders Bible book browsing and chapter reading within the navigation flow.
 * Connects loading and passage selection to callbacks supplied by the navigator.
 */
import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Keyboard } from 'react-native';

import type { BibleBook } from '../models/BibleBook';
import type { PassageSelection } from '../models/PassageSelection';
import type { BibleRepository } from '../repositories/BibleRepository';
import type { ReferenceTarget } from '../services/resolveBibleReference';
import { ReferenceLookupForm } from '../components/ReferenceLookupForm';
import { BooksScreen } from '../screens/BooksScreen';
import { VersesScreen } from '../screens/VersesScreen';
import { useBibleChapterViewModel } from '../view-models/useBibleChapterViewModel';
import { usePassageSelectionViewModel } from '../view-models/usePassageSelectionViewModel';
import { useReferenceLookupViewModel } from '../view-models/useReferenceLookupViewModel';

interface ChapterReadingProps {
  readonly repository: BibleRepository;
  readonly bookId: string;
  readonly chapter: number;
  readonly initialSelection?: PassageSelection;
  readonly onUsePassage: (selection: PassageSelection) => void;
}

interface BookBrowsingProps {
  readonly repository: BibleRepository;
  readonly books: readonly BibleBook[];
  readonly onSelectBook: (book: BibleBook) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
}

/**
 * Connect chapter loading and passage selection to the reading screen.
 */
export function ChapterReading({
  repository,
  bookId,
  chapter,
  initialSelection,
  onUsePassage,
}: ChapterReadingProps) {
  const { state, retry } = useBibleChapterViewModel(repository, bookId, chapter);
  const passage = usePassageSelectionViewModel(repository, bookId, chapter, initialSelection);
  return (
    <VersesScreen
      state={state}
      onRetry={retry}
      selection={passage.selection}
      preview={passage.preview}
      onSelectVerse={passage.selectVerse}
      onClearSelection={passage.clearSelection}
      onRetryPreview={passage.retryPreview}
      onUsePassage={() => {
        if (passage.selection && passage.preview?.status === 'ready') {
          onUsePassage(passage.selection);
        }
      }}
    />
  );
}

/**
 * Connect reference lookup and book browsing to navigation callbacks.
 */
export function BookBrowsing({
  repository,
  books,
  onSelectBook,
  onOpenReference,
}: BookBrowsingProps) {
  const navigation = useNavigation();
  const lookup = useReferenceLookupViewModel(repository, books);
  const { cancelLookup } = lookup;

  // Stack screens stay mounted when covered; cancel lookups when Books loses focus.
  useFocusEffect(
    useCallback(() => {
      return cancelLookup;
    }, [cancelLookup]),
  );

  async function openReference(): Promise<void> {
    const target = await lookup.lookup();
    if (!target || !navigation.isFocused()) return;
    Keyboard.dismiss();
    onOpenReference(target);
  }

  return (
    <BooksScreen
      books={books}
      onSelectBook={(book) => {
        lookup.cancelLookup();
        Keyboard.dismiss();
        onSelectBook(book);
      }}
      referenceLookup={
        <ReferenceLookupForm
          query={lookup.query}
          error={lookup.error}
          isLoading={lookup.isLoading}
          onChangeQuery={lookup.changeQuery}
          onSubmit={() => void openReference()}
        />
      }
    />
  );
}
