/**
 * This screen shows a saved Carry, its passage, and any reflection.
 * It presents actions based on the Carry status.
 */
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCarryStatus } from '../models/getCarryStatus';
import { CarryLoadError, CarryLoadFeedback } from '../components/CarryLoadFeedback';
import type { LoadState } from '../view-models/LoadState';
import type { CarryDetail } from '../view-models/useCarryDetailViewModel';
import { formatCarryStatus, formatSchedule } from './carryDisplay';

export interface CarryDetailScreenProps {
  readonly state: LoadState<CarryDetail>;
  readonly now: Date;
  readonly reminderMessage?: string;
  readonly onRetry: () => void;
  readonly onGoHome: () => void;
  readonly onEdit: () => void;
  readonly onReflect: () => void;
  readonly onDelete: () => void;
  readonly isDeleting: boolean;
  readonly deleteError: string | null;
}

/** Show Carry values with upcoming edits or a ready-to-reflect action, plus any saved reflection. */
export function CarryDetailScreen({
  state,
  now,
  reminderMessage,
  onRetry,
  onGoHome,
  onEdit,
  onReflect,
  onDelete,
  isDeleting,
  deleteError,
}: CarryDetailScreenProps) {
  if (state.status === 'loading') {
    return (
      <View style={styles.loadState}>
        <CarryLoadFeedback resourceLabel="Carry" />
        {deleteError ? (
          <Text accessibilityRole="alert" style={styles.deleteError}>
            {deleteError}
          </Text>
        ) : null}
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.loadState}>
        <CarryLoadError resourceLabel="Carry" onRetry={onRetry} />
        {deleteError ? (
          <Text accessibilityRole="alert" style={styles.deleteError}>
            {deleteError}
          </Text>
        ) : null}
      </View>
    );
  }

  const { carry, categoryName, passage } = state.data;
  const status = getCarryStatus(carry, now);

  /** Ask for native confirmation; cancellation does not write. */
  function requestDelete(): void {
    Alert.alert(
      'Delete this Carry?',
      'This permanently deletes this Carry. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
      { cancelable: true },
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.screenTitle}>
          Carry details
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{formatCarryStatus(status)}</Text>
          <Text accessibilityLiveRegion="polite" style={styles.reminderNote}>
            {reminderMessage ??
              (carry.reminderId
                ? 'A reminder was scheduled for 15 minutes before this Carry.'
                : 'No reminder is linked to this Carry.')}
          </Text>
        </View>

        {deleteError ? (
          <Text accessibilityRole="alert" style={styles.deleteError}>
            {deleteError}
          </Text>
        ) : null}

        {isDeleting ? (
          <View style={styles.deletingFeedback}>
            <ActivityIndicator accessibilityLabel="Deleting Carry" color="#111111" />
            <Text accessibilityLiveRegion="polite" style={styles.deletingText}>
              Deleting Carry…
            </Text>
          </View>
        ) : null}

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

        {carry.reflection ? (
          <View style={styles.reflectionSection}>
            <Text accessibilityRole="header" style={styles.reflectionHeading}>
              Reflection
            </Text>
            <View style={styles.reflectionField}>
              <Text style={styles.fieldLabel}>Alignment</Text>
              <Text style={styles.fieldValue}>{`${carry.reflection.alignmentRating} / 5`}</Text>
            </View>
            <View style={styles.reflectionField}>
              <Text style={styles.fieldLabel}>What happened</Text>
              <Text style={styles.fieldValue}>{carry.reflection.whatOccurred}</Text>
            </View>
            <View style={styles.reflectionField}>
              <Text style={styles.fieldLabel}>Insight</Text>
              <Text style={styles.fieldValue}>{carry.reflection.insight}</Text>
            </View>
          </View>
        ) : null}

        {status === 'readyToReflect' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isDeleting }}
            disabled={isDeleting}
            onPress={onReflect}
            style={({ pressed }) => [
              styles.backButton,
              isDeleting && styles.disabled,
              pressed && !isDeleting && styles.pressed,
            ]}
          >
            <Text style={styles.backButtonText}>Reflect on Carry</Text>
          </Pressable>
        ) : null}

        {status === 'upcoming' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isDeleting }}
            disabled={isDeleting}
            onPress={onEdit}
            style={({ pressed }) => [
              styles.backButton,
              isDeleting && styles.disabled,
              pressed && !isDeleting && styles.pressed,
            ]}
          >
            <Text style={styles.backButtonText}>Edit Carry</Text>
          </Pressable>
        ) : null}

        {status === 'upcoming' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isDeleting, busy: isDeleting }}
            disabled={isDeleting}
            onPress={requestDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              isDeleting && styles.disabled,
              pressed && !isDeleting && styles.pressed,
            ]}
          >
            <Text style={styles.deleteButtonText}>{isDeleting ? 'Deleting…' : 'Delete Carry'}</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isDeleting }}
          disabled={isDeleting}
          onPress={() => onGoHome()}
          style={({ pressed }) => [
            styles.backButton,
            isDeleting && styles.disabled,
            pressed && !isDeleting && styles.pressed,
          ]}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadState: { flex: 1 },
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
  deleteError: { marginTop: 14, color: '#a12622', fontSize: 15, lineHeight: 22 },
  deletingFeedback: { alignItems: 'center', marginTop: 20 },
  deletingText: { marginTop: 6, color: '#333333', fontSize: 14, lineHeight: 20 },
  field: { marginTop: 22 },
  reflectionSection: { marginTop: 22 },
  reflectionHeading: { color: '#111111', fontSize: 17, fontWeight: '600', lineHeight: 25 },
  reflectionField: { marginTop: 12 },
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
  deleteButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#a12622',
    borderRadius: 4,
    paddingHorizontal: 16,
  },
  deleteButtonText: { color: '#a12622', fontSize: 16, lineHeight: 24 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.65, backgroundColor: '#f2f2f2' },
});
