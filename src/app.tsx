import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useBibleBrowserViewModel } from './view-models/useBibleBrowserViewModel';
import { BibleLoadFeedback } from './components/BibleLoadFeedback';
import { openBundledBible } from './repositories/openBundledBible';
import { SQLiteCarryRepository } from './repositories/SQLiteCarryRepository';
import {
  configureNotificationPresentation,
  ExpoNotificationService,
} from './services/ExpoNotificationService';
import { AppNavigator } from './navigation/AppNavigator';

const carryRepository = new SQLiteCarryRepository();
const notifications = new ExpoNotificationService();
configureNotificationPresentation();

/**
 * Supply separate Bible and personal repositories, keeping Bible startup feedback intact.
 */
export function CarryApp() {
  const { state, retry } = useBibleBrowserViewModel(openBundledBible);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {state.status === 'ready' ? (
        <AppNavigator
          repository={state.data.repository}
          carryRepository={carryRepository}
          notifications={notifications}
          books={state.data.books}
        />
      ) : (
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <BibleLoadFeedback status={state.status} onRetry={retry} />
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}
