/**
 * Renders the category name input and saved category choices.
 * Allows retry when saved categories cannot be loaded.
 */
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Category } from '../../models/Category';

interface CarryCategoryFieldProps {
  readonly value: string;
  readonly categories: readonly Category[];
  readonly loadFailed: boolean;
  readonly onRetry: () => void;
  readonly onChange: (value: string) => void;
  readonly disabled: boolean;
  readonly error?: string;
}

export function CarryCategoryField({
  value,
  categories,
  loadFailed,
  onRetry,
  onChange,
  disabled,
  error,
}: CarryCategoryFieldProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Category</Text>
      <TextInput
        accessibilityLabel="Category name"
        editable={!disabled}
        onChangeText={onChange}
        placeholder="For example, Patience"
        placeholderTextColor="#777777"
        returnKeyType="next"
        style={styles.input}
        value={value}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
      {loadFailed ? (
        <View style={styles.inlineFeedback}>
          <Text accessibilityRole="alert" style={styles.supportingText}>
            Saved categories could not be loaded. You can still enter a category name.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={onRetry}
            style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>Try loading categories again</Text>
          </Pressable>
        </View>
      ) : categories.length > 0 ? (
        <View style={styles.categoryChoices}>
          {categories.map((category) => {
            const selected = value === category.name;

            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityLabel={`Use category ${category.name}`}
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => onChange(category.name)}
                style={({ pressed }) => [
                  styles.categoryChoice,
                  selected && styles.categoryChoiceSelected,
                  pressed && styles.pressed,
                  disabled && styles.disabled,
                ]}
              >
                <Text style={styles.categoryChoiceText}>{category.name}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
});
