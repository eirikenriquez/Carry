import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { BiblePassage } from '../models/BiblePassage';
import type { BibleLoadState } from '../view-models/BibleLoadState';

interface PassagePreviewProps {
  readonly preview: BibleLoadState<BiblePassage>;
  readonly onClear: () => void;
  readonly onRetry: () => void;
  readonly onUsePassage: () => void;
}

export function PassagePreview({ preview, onClear, onRetry, onUsePassage }: PassagePreviewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text accessibilityRole="header" style={styles.heading}>
          {preview.status === 'ready' ? preview.data.reference : 'Selected passage'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear passage selection"
          onPress={onClear}
          style={({ pressed }) => [styles.button, pressed && styles.pressedButton]}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </Pressable>
      </View>
      {preview.status === 'loading' && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#111111" />
          <Text accessibilityLiveRegion="polite">Loading preview…</Text>
        </View>
      )}
      {preview.status === 'error' && (
        <View>
          <Text accessibilityRole="alert">The passage preview could not be loaded.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry passage preview"
            onPress={onRetry}
            style={({ pressed }) => [styles.button, pressed && styles.pressedButton]}
          >
            <Text style={styles.buttonText}>Retry preview</Text>
          </Pressable>
        </View>
      )}
      {preview.status === 'ready' && (
        <>
          <ScrollView style={styles.textScroll} nestedScrollEnabled>
            {preview.data.verses.map((verse) => (
              <Text key={verse.key} style={styles.verseText}>
                {verse.verse}. {verse.text.trim() ? verse.text : 'No verse text in this edition.'}
              </Text>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={onUsePassage}
            style={({ pressed }) => [styles.button, pressed && styles.pressedButton]}
          >
            <Text style={styles.buttonText}>Use in a Carry</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: '#f5f7f9',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: { flex: 1, fontSize: 18, fontWeight: '600', color: '#111111' },
  button: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingHorizontal: 8 },
  pressedButton: { opacity: 0.6 },
  buttonText: { fontSize: 16, color: '#111111', textDecorationLine: 'underline' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  // Keep long passage previews scrollable without replacing the chapter list.
  textScroll: { maxHeight: 144, flexGrow: 0 },
  verseText: { fontSize: 18, lineHeight: 28, color: '#111111', paddingBottom: 8 },
});
