import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text } from 'react-native';

import type { useBibleSetupViewModel } from '../view-models/useBibleSetupViewModel';

interface SetupScreenProps {
  readonly bible: ReturnType<typeof useBibleSetupViewModel>;
}

export function SetupScreen({ bible }: SetupScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Carry</Text>
      {bible.status === 'loading' && <Text>Loading Scripture…</Text>}
      {bible.status === 'error' && <Text>Scripture could not be loaded. Please reopen Carry.</Text>}
      {bible.status === 'ready' && (
        <>
          <Text>{bible.bookCount} Bible books available offline</Text>
          <Text style={styles.reference}>{bible.reference}</Text>
          <Text style={styles.passage}>{bible.text}</Text>
          <Text style={styles.edition}>World English Bible</Text>
        </>
      )}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
  },
  title: {
    marginBottom: 8,
    fontSize: 28,
    fontWeight: '600',
  },
  reference: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 20,
    fontWeight: '600',
  },
  passage: {
    fontSize: 18,
    lineHeight: 28,
  },
  edition: {
    marginTop: 16,
    color: '#555555',
  },
});
