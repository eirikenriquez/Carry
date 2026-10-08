/**
 * Connects the Bible and Carry screens to stack navigation.
 * Passes IDs and passage selections between screens and handles reminder taps.
 */
import { useCallback, useState } from 'react';
import {
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Text } from 'react-native';

import type { BibleRepository } from '../repositories/BibleRepository';
import type { CarryRepository } from '../repositories/CarryRepository';
import type { NotificationService } from '../services/NotificationService';
import type { BibleBook } from '../models/BibleBook';
import type { PassageSelection } from '../models/PassageSelection';
import { ChaptersScreen } from '../screens/ChaptersScreen';
import { BookBrowsing, ChapterReading } from './BibleScreens';
import {
  CarryDetailFlow,
  CreateCarryFlow,
  EditCarryFlow,
  HomeFlow,
  ReflectCarryFlow,
} from './CarryScreens';
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
  ReflectCarry: { carryId: string };
  Home: { reminderMessage?: string } | undefined;
  CarryDetail: { carryId: string; reminderMessage?: string };
};

interface AppNavigatorProps {
  readonly repository: BibleRepository;
  readonly carryRepository: CarryRepository;
  readonly notifications: NotificationService;
  readonly books: readonly BibleBook[];
}

const Stack = createNativeStackNavigator<AppRoutes>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#ffffff' },
};

/**
 * Wire Home, Bible selection and Carry screens without passing stored text through routes.
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
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" options={{ title: 'Home' }}>
          {({ navigation, route }: NativeStackScreenProps<AppRoutes, 'Home'>) => (
            <HomeFlow
              repository={carryRepository}
              reminderMessage={route.params?.reminderMessage}
              onClearReminderMessage={() => navigation.setParams({ reminderMessage: undefined })}
              onOpenCarry={(carryId) => navigation.navigate('CarryDetail', { carryId })}
              onNewCarry={() =>
                navigation.navigate('Books', { selectForCarry: { screen: 'CreateCarry' } })
              }
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Books"
          options={({ route }) => ({
            title: route.params?.selectForCarry ? 'Choose Scripture' : 'Bible books',
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
                  } else if (
                    navigation
                      .getState()
                      .routes.some((stackRoute) => stackRoute.name === 'CreateCarry')
                  ) {
                    // Reuse the mounted form so changing Scripture keeps its draft.
                    navigation.popTo('CreateCarry', { selection });
                  } else {
                    navigation.push('CreateCarry', { selection });
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
                // Discard the Bible picker history so Back from details returns to Home.
                navigation.reset({
                  index: 1,
                  routes: [
                    { name: 'Home' },
                    {
                      name: 'CarryDetail',
                      params: { carryId, reminderMessage: reminderMessage ?? undefined },
                    },
                  ],
                })
              }
              onCancel={() => navigation.popTo('Home')}
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
              notifications={notifications}
              carryId={route.params.carryId}
              selection={route.params.selection}
              onSaved={(reminderMessage) =>
                navigation.popTo('CarryDetail', {
                  carryId: route.params.carryId,
                  reminderMessage: reminderMessage ?? undefined,
                })
              }
              onCancel={() => navigation.goBack()}
              onChangePassage={() =>
                navigation.push('Books', {
                  selectForCarry: { screen: 'EditCarry', carryId: route.params.carryId },
                })
              }
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="ReflectCarry" options={{ title: 'Reflect on Carry' }}>
          {({ route, navigation }: NativeStackScreenProps<AppRoutes, 'ReflectCarry'>) => (
            <ReflectCarryFlow
              key={route.params.carryId}
              repository={carryRepository}
              carryId={route.params.carryId}
              onSaved={() => navigation.popTo('CarryDetail', { carryId: route.params.carryId })}
              onCancel={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="CarryDetail" options={{ title: 'Saved Carry' }}>
          {({ route, navigation }: NativeStackScreenProps<AppRoutes, 'CarryDetail'>) => (
            <CarryDetailFlow
              repository={carryRepository}
              bibleRepository={repository}
              notifications={notifications}
              carryId={route.params.carryId}
              onGoHome={(reminderMessage) => navigation.popTo('Home', { reminderMessage })}
              reminderMessage={route.params.reminderMessage}
              onEdit={() => navigation.push('EditCarry', { carryId: route.params.carryId })}
              onReflect={() => navigation.push('ReflectCarry', { carryId: route.params.carryId })}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
