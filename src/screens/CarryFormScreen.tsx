/**
 * Displays the form for creating or editing a Carry.
 * Sends user changes to the ViewModel, which handles validation and saving.
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

import { CarryScheduleField } from '../components/carry-form/CarryScheduleField';
import type { BiblePassage } from '../models/BiblePassage';
import type { Category } from '../models/Category';
import type { CarryFormDraft, CarryFormErrors, CarryFormMode } from '../view-models/CarryFormState';
import type { LoadState } from '../view-models/LoadState';

export interface CarryFormScreenProps {
  readonly draft: CarryFormDraft;
  readonly categories: readonly Category[];
  readonly categoryLoadFailed: boolean;
  readonly onRetryCategories: () => void;
  readonly passagePreview: LoadState<BiblePassage>;
  readonly onRetryPassage: () => void;
  readonly errors: CarryFormErrors;
  readonly saveError: string | null;
  readonly isSaving: boolean;
  readonly mode?: CarryFormMode;
  readonly onChangeCategory: (value: string) => void;
  readonly onChangeSituation: (value: string) => void;
  readonly onChangeIntention: (value: string) => void;
  readonly onChangeSchedule: (value: Date) => void;
  readonly onChangePassage: () => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

export function CarryFormScreen({
  draft,
  categories,
  categoryLoadFailed,
  onRetryCategories,
  passagePreview,
  onRetryPassage,
  errors,
  saveError,
  isSaving,
  mode = 'create',
  onChangeCategory,
  onChangeSituation,
  onChangeIntention,
  onChangeSchedule,
  onChangePassage,
  onSave,
  onCancel,
}: CarryFormScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.screenTitle}>
            {mode === 'create' ? 'Create a Carry' : 'Edit Carry'}
          </Text>
          <Text style={styles.intro}>
            Choose a moment, connect it with Scripture, and make a small plan for how to respond.
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              accessibilityLabel="Category name"
              editable={!isSaving}
              onChangeText={onChangeCategory}
              placeholder="For example, Patience"
              placeholderTextColor="#777777"
              returnKeyType="next"
              style={styles.input}
              value={draft.categoryName}
            />
            <FieldError message={errors.categoryName} />
            {categoryLoadFailed ? (
              <View style={styles.inlineFeedback}>
                <Text accessibilityRole="alert" style={styles.supportingText}>
                  Saved categories could not be loaded. You can still enter a category name.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={onRetryCategories}
                  style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
                >
                  <Text style={styles.linkText}>Try loading categories again</Text>
                </Pressable>
              </View>
            ) : categories.length > 0 ? (
              <View style={styles.categoryChoices}>
                {categories.map((category) => {
                  const selected = draft.categoryName === category.name;

                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Use category ${category.name}`}
                      accessibilityState={{ selected, disabled: isSaving }}
                      disabled={isSaving}
                      onPress={() => onChangeCategory(category.name)}
                      style={({ pressed }) => [
                        styles.categoryChoice,
                        selected && styles.categoryChoiceSelected,
                        pressed && styles.pressed,
                        isSaving && styles.disabled,
                      ]}
                    >
                      <Text style={styles.categoryChoiceText}>{category.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>What situation do you want to prepare for?</Text>
            <TextInput
              accessibilityLabel="Situation"
              editable={!isSaving}
              multiline
              onChangeText={onChangeSituation}
              placeholder="Describe the moment you have in mind."
              placeholderTextColor="#777777"
              style={[styles.input, styles.multilineInput]}
              textAlignVertical="top"
              value={draft.situation}
            />
            <FieldError message={errors.situation} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.label}>Scripture passage</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change selected passage"
                accessibilityState={{ disabled: isSaving }}
                disabled={isSaving}
                onPress={onChangePassage}
                style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
              >
                <Text style={styles.linkText}>Change passage</Text>
              </Pressable>
            </View>
            <View style={styles.passageCard}>
              {passagePreview.status === 'loading' ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator accessibilityLabel="Loading passage preview" color="#111111" />
                  <Text accessibilityLiveRegion="polite" style={styles.supportingText}>
                    Loading passage preview…
                  </Text>
                </View>
              ) : passagePreview.status === 'error' ? (
                <View>
                  <Text accessibilityRole="alert" style={styles.supportingText}>
                    The selected passage could not be loaded.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading passage preview"
                    disabled={isSaving}
                    onPress={onRetryPassage}
                    style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.linkText}>Try again</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={styles.passageReference}>{passagePreview.data.reference}</Text>
                  {passagePreview.data.verses.map((verse) => (
                    <Text key={verse.key} style={styles.passageText}>
                      {verse.verse}.{' '}
                      {verse.text.trim() ? verse.text : 'No verse text in this edition.'}
                    </Text>
                  ))}
                </>
              )}
            </View>
            <FieldError message={errors.passage} />
          </View>

          <CarryScheduleField
            value={draft.scheduledAt}
            onChange={onChangeSchedule}
            disabled={isSaving}
            error={errors.scheduledAt}
          />

          <View style={styles.section}>
            <Text style={styles.label}>Make an if-then plan</Text>
            <Text style={styles.example}>
              Example: If I feel rushed, then I will pause and remember this passage.
            </Text>
            <TextInput
              accessibilityLabel="If-then intention"
              editable={!isSaving}
              multiline
              onChangeText={onChangeIntention}
              placeholder="If I…, then I will…"
              placeholderTextColor="#777777"
              style={[styles.input, styles.multilineInput]}
              textAlignVertical="top"
              value={draft.ifThenIntention}
            />
            <FieldError message={errors.ifThenIntention} />
          </View>

          {saveError ? (
            <Text accessibilityRole="alert" style={styles.saveError}>
              {saveError}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
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
              accessibilityLabel={
                isSaving ? 'Saving Carry' : mode === 'create' ? 'Save Carry' : 'Save changes'
              }
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
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'create' ? 'Save Carry' : 'Save changes'}
                </Text>
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
  intro: { marginTop: 8, color: '#555555', fontSize: 16, lineHeight: 24 },
  section: { marginTop: 24 },
  label: { color: '#111111', fontSize: 17, fontWeight: '600', lineHeight: 24 },
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
  supportingText: { color: '#555555', fontSize: 15, lineHeight: 22 },
  inlineFeedback: { marginTop: 8 },
  inlineButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
  },
  linkText: { color: '#111111', fontSize: 15, lineHeight: 22, textDecorationLine: 'underline' },
  categoryChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  categoryChoice: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 4,
    paddingHorizontal: 14,
  },
  categoryChoiceSelected: { borderColor: '#111111', backgroundColor: '#f2f2f2' },
  categoryChoiceText: { color: '#111111', fontSize: 15, lineHeight: 22 },
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
  example: { marginTop: 4, color: '#555555', fontSize: 14, lineHeight: 20 },
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
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
});
