/**
 * This screen presents the reflection prompts for a Carry.
 * It collects rating, response, and insight input for saving.
 */
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ReflectionDraft, ReflectionFieldErrors } from '../view-models/useReflectionViewModel';

export interface ReflectionFormScreenProps {
  readonly draft: ReflectionDraft;
  readonly fieldErrors: ReflectionFieldErrors;
  readonly situation: string;
  readonly ifThenIntention: string;
  readonly saveError: string | null;
  readonly isSaving: boolean;
  readonly onChangeRating: (value: number | null) => void;
  readonly onChangeWhatOccurred: (value: string) => void;
  readonly onChangeInsight: (value: string) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

/** Present the reflection context and inputs while saving and validation stay in the ViewModel. */
export function ReflectionFormScreen({
  draft,
  fieldErrors,
  situation,
  ifThenIntention,
  saveError,
  isSaving,
  onChangeRating,
  onChangeWhatOccurred,
  onChangeInsight,
  onSave,
  onCancel,
}: ReflectionFormScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.screenTitle}>
            Reflect on your Carry
          </Text>

          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>Situation</Text>
            <Text style={styles.contextText}>{situation}</Text>
            <Text style={[styles.contextLabel, styles.planLabel]}>Your if–then plan</Text>
            <Text style={styles.contextText}>{ifThenIntention}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Alignment (required)</Text>
            <Text style={styles.scaleExplanation}>
              How closely did your response follow your plan? 1 = not at all; 5 = closely.
            </Text>
            <View style={styles.ratingChoices}>
              {[1, 2, 3, 4, 5].map((rating) => {
                const selected = draft.alignmentRating === rating;
                return (
                  <Pressable
                    key={rating}
                    accessibilityRole="radio"
                    accessibilityLabel={`Rating ${rating}`}
                    accessibilityState={{ checked: selected, selected, disabled: isSaving }}
                    disabled={isSaving}
                    onPress={() => onChangeRating(rating)}
                    style={({ pressed }) => [
                      styles.ratingChoice,
                      selected && styles.ratingChoiceSelected,
                      pressed && styles.pressed,
                      isSaving && styles.disabled,
                    ]}
                  >
                    <Text style={[styles.ratingText, selected && styles.ratingTextSelected]}>
                      {rating}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <FieldError message={fieldErrors.alignmentRating} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>What happened? (required)</Text>
            <TextInput
              accessibilityLabel="What happened (required)"
              editable={!isSaving}
              multiline
              onChangeText={onChangeWhatOccurred}
              placeholder="Describe how you responded."
              placeholderTextColor="#777777"
              style={[styles.input, styles.multilineInput]}
              textAlignVertical="top"
              value={draft.whatOccurred}
            />
            <FieldError message={fieldErrors.whatOccurred} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>What did you learn? (required)</Text>
            <TextInput
              accessibilityLabel="What did you learn (required)"
              editable={!isSaving}
              multiline
              onChangeText={onChangeInsight}
              placeholder="Write down an insight to carry forward."
              placeholderTextColor="#777777"
              style={[styles.input, styles.multilineInput]}
              textAlignVertical="top"
              value={draft.insight}
            />
            <FieldError message={fieldErrors.insight} />
          </View>

          {saveError ? (
            <Text accessibilityRole="alert" style={styles.saveError}>
              {saveError}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSaving }}
              disabled={isSaving}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
                isSaving && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSaving ? 'Saving reflection' : 'Save reflection'}
              accessibilityState={{ disabled: isSaving, busy: isSaving }}
              disabled={isSaving}
              onPress={onSave}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                isSaving && styles.disabled,
              ]}
            >
              {isSaving ? (
                <View style={styles.savingContent}>
                  <ActivityIndicator color="#ffffff" />
                  <Text accessibilityLiveRegion="polite" style={styles.primaryButtonText}>
                    Saving reflection…
                  </Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Save reflection</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldError({ message }: { readonly message?: string }) {
  if (!message) return null;

  return (
    <Text accessibilityRole="alert" style={styles.errorText}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  keyboardAvoiding: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  screenTitle: { color: '#111111', fontSize: 28, fontWeight: '600', lineHeight: 36 },
  contextCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 4,
    padding: 12,
  },
  contextLabel: { color: '#555555', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  contextText: { marginTop: 2, color: '#111111', fontSize: 16, lineHeight: 24 },
  planLabel: { marginTop: 12 },
  section: { marginTop: 24 },
  label: { color: '#111111', fontSize: 17, fontWeight: '600', lineHeight: 24 },
  scaleExplanation: { marginTop: 4, color: '#555555', fontSize: 15, lineHeight: 22 },
  ratingChoices: { flexDirection: 'row', gap: 8, marginTop: 10 },
  ratingChoice: {
    minWidth: 48,
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  ratingChoiceSelected: { borderColor: '#111111', backgroundColor: '#111111' },
  ratingText: { color: '#111111', fontSize: 17, fontWeight: '600', lineHeight: 24 },
  ratingTextSelected: { color: '#ffffff' },
  input: {
    minHeight: 48,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111111',
    fontSize: 16,
    lineHeight: 24,
    backgroundColor: '#ffffff',
  },
  multilineInput: { minHeight: 104, paddingTop: 12 },
  errorText: { marginTop: 6, color: '#8a1c1c', fontSize: 14, lineHeight: 20 },
  saveError: { marginTop: 24, color: '#8a1c1c', fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  secondaryButton: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#777777',
    borderRadius: 4,
    paddingHorizontal: 12,
  },
  secondaryButtonText: { color: '#111111', fontSize: 16, lineHeight: 24 },
  primaryButton: {
    minHeight: 52,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#111111',
    paddingHorizontal: 12,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', lineHeight: 24 },
  savingContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
});
