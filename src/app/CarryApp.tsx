import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useBibleBrowserViewModel } from '../features/bible/view-models/useBibleBrowserViewModel';
import { BibleLoadFeedback } from '../features/bible/views/BibleLoadFeedback';
import { openBundledBible } from '../infrastructure/repositories/openBundledBible';
import { SQLiteCarryRepository } from '../infrastructure/repositories/SQLiteCarryRepository';
import { AppNavigator } from './AppNavigator';

const carryRepository = new SQLiteCarryRepository();

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
