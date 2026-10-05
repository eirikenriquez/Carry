/**
 * Renders the selected Scripture passage and its loading feedback.
 * Offers retry and passage-change actions while preserving the form's disabled state.
 */
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BiblePassage } from '../../models/BiblePassage';
import type { LoadState } from '../../view-models/LoadState';

interface CarryPassageFieldProps {
  readonly preview: LoadState<BiblePassage>;
  readonly onRetry: () => void;
  readonly onChangePassage: () => void;
  readonly disabled: boolean;
  readonly error?: string;
}

export function CarryPassageField({
  preview,
  onRetry,
  onChangePassage,
  disabled,
  error,
}: CarryPassageFieldProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.label}>Scripture passage</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change selected passage"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onChangePassage}
          style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
        >
          <Text style={styles.linkText}>Change passage</Text>
        </Pressable>
      </View>
      <View style={styles.passageCard}>
        {preview.status === 'loading' ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator accessibilityLabel="Loading passage preview" color="#111111" />
            <Text accessibilityLiveRegion="polite" style={styles.supportingText}>
              Loading passage preview…
            </Text>
          </View>
        ) : preview.status === 'error' ? (
          <View>
            <Text accessibilityRole="alert" style={styles.supportingText}>
              The selected passage could not be loaded.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading passage preview"
              disabled={disabled}
              onPress={onRetry}
              style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
            >
              <Text style={styles.linkText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.passageReference}>{preview.data.reference}</Text>
            {preview.data.verses.map((verse) => (
              <Text key={verse.key} style={styles.passageText}>
                {verse.verse}. {verse.text.trim() ? verse.text : 'No verse text in this edition.'}
              </Text>
            ))}
          </>
        )}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  label: { color: '#111111', fontSize: 17, fontWeight: '600', lineHeight: 24 },
  errorText: { marginTop: 6, color: '#8a1c1c', fontSize: 14, lineHeight: 20 },
  supportingText: { color: '#555555', fontSize: 15, lineHeight: 22 },
  inlineButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
  },
  linkText: { color: '#111111', fontSize: 15, lineHeight: 22, textDecorationLine: 'underline' },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  passageCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 4,
    padding: 12,
  },
  passageReference: {
    marginBottom: 8,
    color: '#111111',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  passageText: { color: '#333333', fontSize: 15, lineHeight: 23, paddingBottom: 8 },
  loadingRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.65 },
});
