/**
 * This screen shows the verses for the selected chapter.
 * It lets users select a passage range and preview it.
 */
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BibleVerse } from '../models/BibleVerse';
import type { BiblePassage } from '../models/BiblePassage';
import type { PassageSelection } from '../models/PassageSelection';
import type { LoadState } from '../view-models/LoadState';
import { BibleLoadFeedback } from '../components/BibleLoadFeedback';
import { PassagePreview } from '../components/PassagePreview';

interface VersesScreenProps {
  readonly state: LoadState<readonly BibleVerse[]>;
  readonly onRetry: () => void;
  readonly selection: PassageSelection | null;
  readonly preview: LoadState<BiblePassage> | null;
  readonly onSelectVerse: (verse: BibleVerse) => void;
  readonly onClearSelection: () => void;
  readonly onRetryPreview: () => void;
  readonly onUsePassage: () => void;
}

export function VersesScreen({
  state,
  onRetry,
  selection,
  preview,
  onSelectVerse,
  onClearSelection,
  onRetryPreview,
  onUsePassage,
}: VersesScreenProps) {
  if (state.status !== 'ready') {
    return <BibleLoadFeedback status={state.status} onRetry={onRetry} />;
  }

  const startIndex = state.data.findIndex((verse) => verse.key === selection?.startVerseKey);
  const endIndex = state.data.findIndex((verse) => verse.key === selection?.endVerseKey);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Text style={styles.instructions}>Tap twice for a range; tap again to start over.</Text>
      <FlatList
        data={state.data}
        extraData={selection}
        keyExtractor={(verse) => verse.key}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={<Text style={styles.edition}>World English Bible</Text>}
        renderItem={({ item: verse, index }) => {
          const text = verse.text.trim() ? verse.text : 'No verse text in this edition.';
          const selected = startIndex >= 0 && index >= startIndex && index <= endIndex;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Verse ${verse.verse}. ${text}`}
              accessibilityState={{ selected }}
              onPress={() => onSelectVerse(verse)}
              style={({ pressed }) => [
                styles.verseRow,
                selected && styles.selectedVerse,
                pressed && styles.pressedVerse,
              ]}
            >
              <Text style={styles.verseNumber}>{verse.verse}</Text>
              <Text style={styles.verseText}>{text}</Text>
            </Pressable>
          );
        }}
      />
      {selection && preview && (
        <PassagePreview
          preview={preview}
          onClear={onClearSelection}
          onRetry={onRetryPreview}
          onUsePassage={onUsePassage}
        />
      )}
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
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  instructions: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#555555',
  },
  selectedVerse: { backgroundColor: '#e7eef4' },
  pressedVerse: { backgroundColor: '#f2f2f2' },
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
