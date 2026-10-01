import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BibleLoadFeedbackProps {
  readonly status: 'loading' | 'error';
  readonly onRetry: () => void;
}

export function BibleLoadFeedback({ status, onRetry }: BibleLoadFeedbackProps) {
  const isLoading = status === 'loading';

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        {isLoading ? (
          <>
            <ActivityIndicator accessibilityLabel="Loading Scripture" color="#111111" />
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              Loading Scripture…
            </Text>
          </>
        ) : (
          <>
            <Text accessibilityRole="alert" style={styles.message}>
              Scripture could not be loaded.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading Scripture"
              onPress={onRetry}
              style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            >
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    color: '#111111',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 48,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#777777',
    borderRadius: 4,
    paddingHorizontal: 16,
  },
  retryButtonPressed: {
    backgroundColor: '#f2f2f2',
  },
  retryLabel: {
    color: '#111111',
    fontSize: 16,
    lineHeight: 24,
  },
});
