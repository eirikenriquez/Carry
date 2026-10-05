/**
 * This component accepts a Bible reference.
 * It shows the query field, submit action, and any error.
 */
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface ReferenceLookupFormProps {
  readonly query: string;
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly onChangeQuery: (value: string) => void;
  readonly onSubmit: () => void;
}

export function ReferenceLookupForm({
  query,
  error,
  isLoading,
  onChangeQuery,
  onSubmit,
}: ReferenceLookupFormProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Open a reference</Text>
      <Text style={styles.help}>Full book name, e.g. John 3:16 or James 1:19–20.</Text>
      <TextInput
        accessibilityLabel="Bible reference"
        placeholder="John 3:16"
        value={query}
        onChangeText={onChangeQuery}
        onSubmitEditing={onSubmit}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="go"
        maxLength={100}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Bible reference"
        accessibilityState={{ disabled: isLoading, busy: isLoading }}
        disabled={isLoading}
        onPress={onSubmit}
        style={({ pressed }) => [styles.button, (pressed || isLoading) && styles.buttonMuted]}
      >
        <Text style={styles.buttonText}>{isLoading ? 'Opening…' : 'Open passage'}</Text>
      </Pressable>
      {error && (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 16, gap: 8 },
  label: { fontSize: 18, fontWeight: '600', color: '#111111' },
  help: { fontSize: 14, lineHeight: 20, color: '#555555' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#777777',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111111',
  },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#243447',
  },
  buttonMuted: { opacity: 0.6 },
  buttonText: { fontSize: 16, color: '#ffffff' },
  error: { fontSize: 14, lineHeight: 20, color: '#8b1e1e' },
});
