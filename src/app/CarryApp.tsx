import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useBibleBrowserViewModel } from '../features/bible/view-models/useBibleBrowserViewModel';
import { BibleLoadFeedback } from '../features/bible/views/BibleLoadFeedback';
import { openBundledBible } from '../infrastructure/repositories/openBundledBible';
import { BibleNavigator } from './BibleNavigator';

// Composition root: future repositories, services, and ViewModels are wired here.
export function CarryApp() {
  const { state, retry } = useBibleBrowserViewModel(openBundledBible);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {state.status === 'ready' ? (
        <BibleNavigator repository={state.data.repository} books={state.data.books} />
      ) : (
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <BibleLoadFeedback status={state.status} onRetry={retry} />
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}
