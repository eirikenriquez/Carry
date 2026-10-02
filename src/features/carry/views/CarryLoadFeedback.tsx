import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CarryLoadFeedbackProps {
  readonly resourceLabel: string;
}

export function CarryLoadFeedback({ resourceLabel }: CarryLoadFeedbackProps) {
  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.heading}>
          {resourceLabel}
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          Loading {resourceLabel.toLowerCase()}…
        </Text>
        <ActivityIndicator accessibilityLabel={`Loading ${resourceLabel}`} color="#111111" />
      </View>
    </SafeAreaView>
  );
}

interface CarryLoadErrorProps extends CarryLoadFeedbackProps {
  readonly onRetry: () => void;
}

export function CarryLoadError({ resourceLabel, onRetry }: CarryLoadErrorProps) {
  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.heading}>
          {resourceLabel}
        </Text>
        <Text accessibilityRole="alert" style={styles.message}>
          {resourceLabel} could not be loaded.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Retry loading ${resourceLabel.toLowerCase()}`}
          onPress={onRetry}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
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
  heading: {
    color: '#111111',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    textAlign: 'center',
  },
  message: {
    marginTop: 12,
    color: '#444444',
    fontSize: 16,
    lineHeight: 24,
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
  pressed: {
    backgroundColor: '#f2f2f2',
  },
  buttonText: {
    color: '#111111',
    fontSize: 16,
    lineHeight: 24,
  },
});
