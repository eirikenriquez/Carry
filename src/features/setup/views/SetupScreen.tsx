import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export function SetupScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Carry</Text>
      <Text>App setup is ready.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    marginBottom: 8,
    fontSize: 28,
    fontWeight: '600',
  },
});
