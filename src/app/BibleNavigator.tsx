import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Keyboard, Text } from 'react-native';

import type { BibleRepository } from '../application/ports/BibleRepository';
import type { BibleBook } from '../domain/entities/BibleBook';
import type { PassageSelection } from '../domain/entities/PassageSelection';
import type { ReferenceTarget } from '../application/services/resolveBibleReference';
import { useBibleChapterViewModel } from '../features/bible/view-models/useBibleChapterViewModel';
import { usePassageSelectionViewModel } from '../features/bible/view-models/usePassageSelectionViewModel';
import { useReferenceLookupViewModel } from '../features/bible/view-models/useReferenceLookupViewModel';
import { ReferenceLookupForm } from '../features/bible/views/ReferenceLookupForm';
import { BooksScreen } from '../features/bible/views/BooksScreen';
import { ChaptersScreen } from '../features/bible/views/ChaptersScreen';
import { VersesScreen } from '../features/bible/views/VersesScreen';

type BibleRoutes = {
  Books: undefined;
  Chapters: { bookId: string };
  Verses: { bookId: string; chapter: number; selection?: PassageSelection };
};

const Stack = createNativeStackNavigator<BibleRoutes>();
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#ffffff' },
};

interface BibleNavigatorProps {
  readonly repository: BibleRepository;
  readonly books: readonly BibleBook[];
}

interface ChapterReadingProps {
  readonly repository: BibleRepository;
  readonly bookId: string;
  readonly chapter: number;
  readonly initialSelection?: PassageSelection;
}

/**
 * Connect chapter loading and passage selection to the reading screen.
 */
function ChapterReading({ repository, bookId, chapter, initialSelection }: ChapterReadingProps) {
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
    />
  );
}

interface BookBrowsingProps extends BibleNavigatorProps {
  readonly onSelectBook: (book: BibleBook) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
}

/**
 * Connect reference lookup and book browsing to navigation callbacks.
 */
function BookBrowsing({ repository, books, onSelectBook, onOpenReference }: BookBrowsingProps) {
  const lookup = useReferenceLookupViewModel(repository, books);

  async function openReference(): Promise<void> {
    const target = await lookup.lookup();
    if (!target) return;
    Keyboard.dismiss();
    onOpenReference(target);
  }

  return (
    <BooksScreen
      books={books}
      onSelectBook={(book) => {
        // Browsing away cancels any lookup still waiting for the repository.
        lookup.changeQuery(lookup.query);
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

/**
 * Define the Bible screen stack and pass repository dependencies to each screen.
 */
export function BibleNavigator({ repository, books }: BibleNavigatorProps) {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator initialRouteName="Books">
        <Stack.Screen name="Books" options={{ title: 'Bible books' }}>
          {({ navigation }: NativeStackScreenProps<BibleRoutes, 'Books'>) => (
            <BookBrowsing
              repository={repository}
              books={books}
              onSelectBook={(book) => navigation.navigate('Chapters', { bookId: book.id })}
              onOpenReference={(target) => navigation.push('Verses', target)}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Chapters"
          options={({ route }) => ({
            title: books.find((book) => book.id === route.params.bookId)?.name ?? 'Chapters',
          })}
        >
          {({ navigation, route }: NativeStackScreenProps<BibleRoutes, 'Chapters'>) => {
            const book = books.find((item) => item.id === route.params.bookId);
            if (!book) return <Text>This Bible book is unavailable. Please go back.</Text>;

            return (
              <ChaptersScreen
                book={book}
                onSelectChapter={(chapter) =>
                  navigation.navigate('Verses', { bookId: book.id, chapter })
                }
              />
            );
          }}
        </Stack.Screen>
        <Stack.Screen
          name="Verses"
          options={({ route }) => ({
            title: `${books.find((book) => book.id === route.params.bookId)?.name ?? 'Bible'} ${route.params.chapter}`,
          })}
        >
          {({ route }: NativeStackScreenProps<BibleRoutes, 'Verses'>) => (
            // Remount local reading state when the book or chapter changes.
            <ChapterReading
              key={`${route.params.bookId}.${route.params.chapter}`}
              repository={repository}
              bookId={route.params.bookId}
              chapter={route.params.chapter}
              initialSelection={route.params.selection}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
