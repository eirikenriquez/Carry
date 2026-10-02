import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCarryStatus } from '../../../domain/rules/getCarryStatus';
import { CarryLoadError, CarryLoadFeedback } from './CarryLoadFeedback';
import type { CarryLoadState } from '../view-models/CarryLoadState';

import type { CarryDetail } from '../view-models/useCarryDetailViewModel';
import { formatCarryStatus, formatSchedule } from './carryDisplay';

export interface CarryDetailScreenProps {
  readonly state: CarryLoadState<CarryDetail>;
  readonly onRetry: () => void;
  readonly onViewCarries: () => void;
}

/** Show persisted values and resolved Scripture without lifecycle actions yet. */
export function CarryDetailScreen({ state, onRetry, onViewCarries }: CarryDetailScreenProps) {
  if (state.status === 'loading') {
    return <CarryLoadFeedback resourceLabel="Carry" />;
  }

  if (state.status === 'error') {
    return <CarryLoadError resourceLabel="Carry" onRetry={onRetry} />;
  }

  const { carry, categoryName, passage } = state.data;
  const status = getCarryStatus(carry, new Date());

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.screenTitle}>
          Carry details
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{formatCarryStatus(status)}</Text>
          {status === 'upcoming' ? (
            <Text style={styles.reminderNote}>
              Your schedule is saved, but this prototype does not send reminders yet.
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Category</Text>
          <Text style={styles.fieldValue}>{categoryName}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Situation</Text>
          <Text style={styles.fieldValue}>{carry.situation}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Scheduled for</Text>
          <Text style={styles.fieldValue}>{formatSchedule(carry.scheduledAt)}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Scripture passage</Text>
          <View style={styles.passageCard}>
            <Text style={styles.passageReference}>{passage.reference}</Text>
            {passage.verses.map((verse) => (
              <Text key={verse.key} style={styles.passageText}>
                {verse.verse}. {verse.text.trim() ? verse.text : 'No verse text in this edition.'}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>If-then plan</Text>
          <Text style={styles.fieldValue}>{carry.ifThenIntention}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onViewCarries}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backButtonText}>Back to Carries</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  screenTitle: { color: '#111111', fontSize: 28, fontWeight: '600', lineHeight: 36 },
  statusCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 4,
    padding: 14,
  },
  statusLabel: { color: '#111111', fontSize: 17, fontWeight: '600', lineHeight: 24 },
  reminderNote: { marginTop: 6, color: '#555555', fontSize: 14, lineHeight: 21 },
  field: { marginTop: 22 },
  fieldLabel: { color: '#555555', fontSize: 14, lineHeight: 20 },
  fieldValue: { marginTop: 4, color: '#111111', fontSize: 17, lineHeight: 25 },
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
  passageText: { paddingBottom: 8, color: '#333333', fontSize: 15, lineHeight: 23 },
  backButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#777777',
    borderRadius: 4,
    paddingHorizontal: 16,
  },
  backButtonText: { color: '#111111', fontSize: 16, lineHeight: 24 },
  pressed: { opacity: 0.65, backgroundColor: '#f2f2f2' },
});
