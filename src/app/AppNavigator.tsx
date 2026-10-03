import { useCallback, useState } from 'react';
import {
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Keyboard, Pressable, Text } from 'react-native';

import type { BibleRepository } from '../application/ports/BibleRepository';
import type { CarryRepository } from '../application/ports/CarryRepository';
import type { NotificationService } from '../application/ports/NotificationService';
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
import { CarryDetailFlow, CarryListFlow, CreateCarryFlow, EditCarryFlow } from './CarryScreens';
import { useReminderNavigation } from './useReminderNavigation';

type PassageTarget = { screen: 'CreateCarry' } | { screen: 'EditCarry'; carryId: string };

export type AppRoutes = {
  Books: { selectForCarry?: PassageTarget } | undefined;
  Chapters: { bookId: string; selectForCarry?: PassageTarget };
  Verses: {
    bookId: string;
    chapter: number;
    selection?: PassageSelection;
    selectForCarry?: PassageTarget;
  };
  CreateCarry: { selection: PassageSelection };
  EditCarry: { carryId: string; selection?: PassageSelection };
  Carries: undefined;
  CarryDetail: { carryId: string; reminderMessage?: string };
};

const Stack = createNativeStackNavigator<AppRoutes>();
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#ffffff' },
};

interface AppNavigatorProps {
  readonly repository: BibleRepository;
  readonly carryRepository: CarryRepository;
  readonly notifications: NotificationService;
  readonly books: readonly BibleBook[];
}

interface ChapterReadingProps {
  readonly repository: BibleRepository;
  readonly bookId: string;
  readonly chapter: number;
  readonly initialSelection?: PassageSelection;
  readonly onUsePassage: (selection: PassageSelection) => void;
}

/**
 * Connect chapter loading and passage selection to the reading screen.
 */
function ChapterReading({
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

interface BookBrowsingProps {
  readonly repository: BibleRepository;
  readonly books: readonly BibleBook[];
  readonly onSelectBook: (book: BibleBook) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
}

/**
 * Connect reference lookup and book browsing to navigation callbacks.
 */
function BookBrowsing({ repository, books, onSelectBook, onOpenReference }: BookBrowsingProps) {
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

/**
 * Wire Bible selection and personal Carry screens without passing stored text through routes.
 */
export function AppNavigator({
  repository,
  carryRepository,
  notifications,
  books,
}: AppNavigatorProps) {
  const navigationRef = useNavigationContainerRef<AppRoutes>();
  const [navigationReady, setNavigationReady] = useState(false);
  const handleNavigationReady = useCallback(() => setNavigationReady(true), []);
  useReminderNavigation(navigationRef, navigationReady);

  return (
    <NavigationContainer ref={navigationRef} onReady={handleNavigationReady} theme={theme}>
      <Stack.Navigator initialRouteName="Books">
        <Stack.Screen
          name="Books"
          options={({ navigation, route }) => ({
            title: route.params?.selectForCarry ? 'Choose Scripture' : 'Bible books',
            headerRight: route.params?.selectForCarry
              ? undefined
              : () => (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('Carries')}
                    style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }}
                  >
                    <Text>My Carries</Text>
                  </Pressable>
                ),
          })}
        >
          {({ navigation, route }: NativeStackScreenProps<AppRoutes, 'Books'>) => (
            <BookBrowsing
              repository={repository}
              books={books}
              onSelectBook={(book) =>
                navigation.navigate('Chapters', {
                  bookId: book.id,
                  selectForCarry: route.params?.selectForCarry,
                })
              }
              onOpenReference={(target) =>
                navigation.push('Verses', {
                  ...target,
                  selectForCarry: route.params?.selectForCarry,
                })
              }
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Chapters"
          options={({ route }) => ({
            title: books.find((book) => book.id === route.params.bookId)?.name ?? 'Chapters',
          })}
        >
          {({ navigation, route }: NativeStackScreenProps<AppRoutes, 'Chapters'>) => {
            const book = books.find((item) => item.id === route.params.bookId);
            if (!book) return <Text>This Bible book is unavailable. Please go back.</Text>;

            return (
              <ChaptersScreen
                book={book}
                onSelectChapter={(chapter) =>
                  navigation.navigate('Verses', {
                    bookId: book.id,
                    chapter,
                    selectForCarry: route.params.selectForCarry,
                  })
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
          {({ route, navigation }: NativeStackScreenProps<AppRoutes, 'Verses'>) => (
            // Remount local reading state when the book or chapter changes.
            <ChapterReading
              key={`${route.params.bookId}.${route.params.chapter}`}
              repository={repository}
              bookId={route.params.bookId}
              chapter={route.params.chapter}
              initialSelection={route.params.selection}
              onUsePassage={(selection) => {
                if (route.params.selectForCarry) {
                  // The draft stays mounted below this picker; only its passage changes.
                  const target = route.params.selectForCarry;
                  if (target.screen === 'EditCarry') {
                    navigation.popTo('EditCarry', { carryId: target.carryId, selection });
                  } else {
                    navigation.popTo('CreateCarry', { selection });
                  }
                } else {
                  navigation.push('CreateCarry', { selection });
                }
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="CreateCarry" options={{ title: 'Create a Carry' }}>
          {({ route, navigation }: NativeStackScreenProps<AppRoutes, 'CreateCarry'>) => (
            <CreateCarryFlow
              repository={carryRepository}
              bibleRepository={repository}
              selection={route.params.selection}
              notifications={notifications}
              onSaved={(carryId, reminderMessage) =>
                navigation.replace('CarryDetail', {
                  carryId,
                  reminderMessage: reminderMessage ?? undefined,
                })
              }
              onCancel={() => navigation.goBack()}
              onChangePassage={() =>
                navigation.push('Books', { selectForCarry: { screen: 'CreateCarry' } })
              }
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="EditCarry" options={{ title: 'Edit Carry' }}>
          {({ route, navigation }: NativeStackScreenProps<AppRoutes, 'EditCarry'>) => (
            <EditCarryFlow
              key={route.params.carryId}
              repository={carryRepository}
              bibleRepository={repository}
              carryId={route.params.carryId}
              selection={route.params.selection}
              onSaved={() => navigation.goBack()}
              onCancel={() => navigation.goBack()}
              onChangePassage={() =>
                navigation.push('Books', {
                  selectForCarry: { screen: 'EditCarry', carryId: route.params.carryId },
                })
              }
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Carries" options={{ title: 'My Carries' }}>
          {({ navigation }: NativeStackScreenProps<AppRoutes, 'Carries'>) => (
            <CarryListFlow
              repository={carryRepository}
              onOpenCarry={(carryId) => navigation.navigate('CarryDetail', { carryId })}
              onBrowseBible={() => navigation.navigate('Books')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="CarryDetail" options={{ title: 'Saved Carry' }}>
          {({ route, navigation }: NativeStackScreenProps<AppRoutes, 'CarryDetail'>) => (
            <CarryDetailFlow
              repository={carryRepository}
              bibleRepository={repository}
              carryId={route.params.carryId}
              onViewCarries={() => navigation.popTo('Carries')}
              reminderMessage={route.params.reminderMessage}
              onEdit={() => navigation.push('EditCarry', { carryId: route.params.carryId })}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
