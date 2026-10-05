/**
 * Renders date and time controls for a Carry schedule.
 * Keeps local date and time changes coordinated through the native Android pickers.
 */
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface CarryScheduleFieldProps {
  readonly value: Date | null;
  readonly onChange: (value: Date) => void;
  readonly disabled: boolean;
  readonly error?: string;
}

export function CarryScheduleField({ value, onChange, disabled, error }: CarryScheduleFieldProps) {
  const selectedSchedule = value ?? new Date();

  /** Change the local calendar date without discarding the selected clock time. */
  const openDatePicker = () => {
    DateTimePickerAndroid.open({
      value: selectedSchedule,
      mode: 'date',
      onValueChange: (_event, selectedDate) => {
        const schedule = new Date(selectedDate);
        schedule.setHours(selectedSchedule.getHours(), selectedSchedule.getMinutes(), 0, 0);
        onChange(schedule);
      },
    });
  };

  /** Change local hours/minutes while keeping the selected calendar date. */
  const openTimePicker = () => {
    DateTimePickerAndroid.open({
      value: selectedSchedule,
      mode: 'time',
      onValueChange: (_event, selectedTime) => {
        const schedule = new Date(selectedSchedule);
        schedule.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
        onChange(schedule);
      },
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.label}>When do you expect this situation?</Text>
      <View style={styles.scheduleButtons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose date${value ? `, ${formatDate(value)}` : ''}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={openDatePicker}
          style={({ pressed }) => [styles.scheduleButton, pressed && styles.pressed]}
        >
          <Text style={styles.scheduleButtonLabel}>Date</Text>
          <Text style={styles.scheduleButtonValue}>
            {value ? formatDate(value) : 'Choose date'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose time${value ? `, ${formatTime(value)}` : ''}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={openTimePicker}
          style={({ pressed }) => [styles.scheduleButton, pressed && styles.pressed]}
        >
          <Text style={styles.scheduleButtonLabel}>Time</Text>
          <Text style={styles.scheduleButtonValue}>
            {value ? formatTime(value) : 'Choose time'}
          </Text>
        </Pressable>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function formatDate(value: Date): string {
  return value.toLocaleDateString();
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  label: { color: '#111111', fontSize: 17, fontWeight: '600', lineHeight: 24 },
  errorText: { marginTop: 6, color: '#8a1c1c', fontSize: 14, lineHeight: 20 },
  scheduleButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  scheduleButton: {
    minHeight: 64,
    flex: 1,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scheduleButtonLabel: { color: '#555555', fontSize: 13, lineHeight: 18 },
  scheduleButtonValue: { marginTop: 2, color: '#111111', fontSize: 16, lineHeight: 22 },
  pressed: { opacity: 0.65 },
});
