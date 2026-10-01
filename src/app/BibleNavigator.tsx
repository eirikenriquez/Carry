import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Text } from 'react-native';

import type { BibleRepository } from '../application/ports/BibleRepository';
import type { BibleBook } from '../domain/entities/BibleBook';
import { useBibleChapterViewModel } from '../features/bible/view-models/useBibleChapterViewModel';
import { BooksScreen } from '../features/bible/views/BooksScreen';
import { ChaptersScreen } from '../features/bible/views/ChaptersScreen';
import { VersesScreen } from '../features/bible/views/VersesScreen';

type BibleRoutes = {
  Books: undefined;
  Chapters: { bookId: string };
  Verses: { bookId: string; chapter: number };
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
}

function ChapterReading({ repository, bookId, chapter }: ChapterReadingProps) {
  const { state, retry } = useBibleChapterViewModel(repository, bookId, chapter);
  return <VersesScreen state={state} onRetry={retry} />;
}

export function BibleNavigator({ repository, books }: BibleNavigatorProps) {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator initialRouteName="Books">
        <Stack.Screen name="Books" options={{ title: 'Bible books' }}>
          {({ navigation }: NativeStackScreenProps<BibleRoutes, 'Books'>) => (
            <BooksScreen
              books={books}
              onSelectBook={(book) => navigation.navigate('Chapters', { bookId: book.id })}
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
            <ChapterReading
              repository={repository}
              bookId={route.params.bookId}
              chapter={route.params.chapter}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
