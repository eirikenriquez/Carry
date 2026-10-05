/**
 * Shows the latest saved reflection for a category reused in Carry creation.
 * This read-only preview offers retry without blocking the new Carry form.
 */
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Reflection } from '../../models/Reflection';
import { formatSchedule } from '../../screens/carryDisplay';
import type { LoadState } from '../../view-models/LoadState';

interface CarryCategoryReflectionProps {
  readonly state: LoadState<Reflection | null>;
  readonly onRetry: () => void;
  readonly disabled: boolean;
}

/** Display supporting history separately from the editable draft fields. */
export function CarryCategoryReflection({
  state,
  onRetry,
  disabled,
}: CarryCategoryReflectionProps) {
  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" style={styles.heading}>
        Latest category reflection
      </Text>
      {state.status === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel="Loading previous reflection" color="#555555" />
          <Text style={styles.text}>Loading previous reflection…</Text>
        </View>
      ) : state.status === 'error' ? (
        <>
          <Text accessibilityRole="alert" style={styles.text}>
            Previous reflection could not be loaded. You can still save this Carry.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading previous reflection"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retry,
              pressed && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </>
      ) : state.data === null ? (
        <Text style={styles.text}>No previous reflection for this category yet.</Text>
      ) : (
        <>
          <Text style={styles.text}>{formatSchedule(state.data.createdAt)}</Text>
          <Text style={styles.label}>Alignment</Text>
          <Text style={styles.text}>{`${state.data.alignmentRating} / 5`}</Text>
          <Text style={styles.label}>What happened</Text>
          <Text style={styles.text}>{state.data.whatOccurred}</Text>
          <Text style={styles.label}>Insight</Text>
          <Text style={styles.text}>{state.data.insight}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 12, padding: 14, borderRadius: 4, backgroundColor: '#f2f2f2' },
  heading: { color: '#111111', fontSize: 16, fontWeight: '600', lineHeight: 24 },
  label: { marginTop: 10, color: '#111111', fontSize: 15, fontWeight: '600', lineHeight: 22 },
  text: { marginTop: 4, color: '#555555', fontSize: 15, lineHeight: 22 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  retry: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 8 },
  link: { color: '#111111', fontSize: 15, lineHeight: 22, textDecorationLine: 'underline' },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
});
