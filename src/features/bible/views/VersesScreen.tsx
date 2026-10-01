import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BibleVerse } from '../../../domain/entities/BibleVerse';
import type { BibleLoadState } from '../view-models/BibleLoadState';
import { BibleLoadFeedback } from './BibleLoadFeedback';

interface VersesScreenProps {
  readonly state: BibleLoadState<readonly BibleVerse[]>;
  readonly onRetry: () => void;
}

export function VersesScreen({ state, onRetry }: VersesScreenProps) {
  if (state.status !== 'ready') {
    return <BibleLoadFeedback status={state.status} onRetry={onRetry} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <FlatList
        data={state.data}
        keyExtractor={(verse) => verse.key}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={<Text style={styles.edition}>World English Bible</Text>}
        renderItem={({ item: verse }) => {
          const text = verse.text.trim() ? verse.text : 'No verse text in this edition.';

          return (
            <View
              accessible
              accessibilityLabel={`Verse ${verse.verse}. ${text}`}
              style={styles.verseRow}
            >
              <Text style={styles.verseNumber}>{verse.verse}</Text>
              <Text style={styles.verseText}>{text}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  verseNumber: {
    minWidth: 30,
    paddingTop: 2,
    color: '#555555',
    fontSize: 14,
    lineHeight: 28,
  },
  verseText: {
    flex: 1,
    color: '#111111',
    fontSize: 18,
    lineHeight: 28,
  },
  edition: {
    paddingVertical: 12,
    color: '#555555',
    fontSize: 14,
    lineHeight: 22,
  },
});
