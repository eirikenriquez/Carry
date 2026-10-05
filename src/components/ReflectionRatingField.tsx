/**
 * This field collects the reflection's alignment rating.
 * It leaves validation and saving to its caller.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ReflectionRatingFieldProps {
  readonly value: number | null;
  readonly onChange: (value: number) => void;
  readonly disabled: boolean;
  readonly error?: string;
}

export function ReflectionRatingField({
  value,
  onChange,
  disabled,
  error,
}: ReflectionRatingFieldProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Alignment (required)</Text>
      <Text style={styles.scaleExplanation}>
        How closely did your response follow your plan? 1 = not at all; 5 = closely.
      </Text>
      <View style={styles.ratingChoices}>
        {[1, 2, 3, 4, 5].map((rating) => {
          const selected = value === rating;
          return (
            <Pressable
              key={rating}
              accessibilityRole="radio"
              accessibilityLabel={`Rating ${rating}`}
              accessibilityState={{ checked: selected, selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(rating)}
              style={({ pressed }) => [
                styles.ratingChoice,
                selected && styles.ratingChoiceSelected,
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              <Text style={[styles.ratingText, selected && styles.ratingTextSelected]}>
                {rating}
              </Text>
            </Pressable>
          );
        })}
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
  errorText: { marginTop: 6, color: '#8a1c1c', fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
});
