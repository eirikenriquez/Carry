/**
 * This screen lists Carries in upcoming, ready-to-reflect and completed sections.
 * It opens a selected Carry or starts the flow for creating a new Carry.
 */
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CarryLoadError, CarryLoadFeedback } from '../components/CarryLoadFeedback';
import type { LoadState } from '../view-models/LoadState';
import type { CarryListItem, CarryListSection } from '../view-models/useCarryListViewModel';
import { formatCarryStatus, formatSchedule } from './carryDisplay';

export interface HomeScreenProps {
  readonly state: LoadState<readonly CarryListItem[]>;
  readonly sections: readonly CarryListSection[];
  readonly reminderMessage?: string;
  readonly onRetry: () => void;
  readonly onOpenCarry: (id: string) => void;
  readonly onNewCarry: () => void;
}

const emptyGroupMessages = {
  upcoming: 'No upcoming Carries.',
  readyToReflect: 'No Carries ready to reflect on.',
  completed: 'No completed Carries yet.',
};

/** Render lifecycle groups while keeping detail navigation and load feedback unchanged. */
export function HomeScreen({
  state,
  sections,
  reminderMessage,
  onRetry,
  onOpenCarry,
  onNewCarry,
}: HomeScreenProps) {
  if (state.status === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ReminderWarning message={reminderMessage} />
        <CarryLoadFeedback resourceLabel="Carries" />
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ReminderWarning message={reminderMessage} />
        <CarryLoadError resourceLabel="Carries" onRetry={onRetry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <SectionList<CarryListItem, CarryListSection>
        sections={state.data.length === 0 ? [] : sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item) => item.carry.id}
        contentContainerStyle={[
          styles.listContent,
          state.data.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <View>
            <ReminderWarning message={reminderMessage} />
            <View style={styles.listHeader}>
              <Text accessibilityRole="header" style={styles.screenTitle}>
                Your Carries
              </Text>
              <Text style={styles.intro}>
                Find your upcoming situations and revisit your reflections.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New Carry"
                onPress={onNewCarry}
                style={({ pressed }) => [styles.newCarryButton, pressed && styles.newCarryPressed]}
              >
                <Text style={styles.newCarryButtonText}>New Carry</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyCarryList />}
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={styles.sectionHeading}>
            {formatCarryStatus(section.key)}
          </Text>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <Text style={styles.emptySection}>{emptyGroupMessages[section.key]}</Text>
          ) : null
        }
        renderItem={({ item, section }) => {
          const statusLabel = formatCarryStatus(section.key);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.carry.situation}. ${item.categoryName}. ${statusLabel}. Scheduled ${formatSchedule(item.carry.scheduledAt)}.`}
              onPress={() => onOpenCarry(item.carry.id)}
              style={({ pressed }) => [styles.carryCard, pressed && styles.pressed]}
            >
              <View style={styles.carryCardHeading}>
                <Text numberOfLines={2} style={styles.situation}>
                  {item.carry.situation}
                </Text>
                <Text style={styles.status}>{statusLabel}</Text>
              </View>
              <Text style={styles.category}>{item.categoryName}</Text>
              <Text style={styles.schedule}>
                Scheduled {formatSchedule(item.carry.scheduledAt)}
              </Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function EmptyCarryList() {
  return (
    <View style={styles.emptyContent}>
      <Text style={styles.emptyHeading}>No Carries saved yet</Text>
      <Text style={styles.emptyMessage}>
        Browse the Bible and choose a passage to create your first Carry.
      </Text>
    </View>
  );
}

function ReminderWarning({ message }: { readonly message?: string }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.reminderWarning}>
      {message}
    </Text>
  ) : null;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  emptyListContent: { flexGrow: 1 },
  listHeader: { paddingTop: 20, paddingBottom: 12 },
  screenTitle: { color: '#111111', fontSize: 28, fontWeight: '600', lineHeight: 36 },
  intro: { marginTop: 6, color: '#555555', fontSize: 15, lineHeight: 22 },
  sectionHeading: {
    marginTop: 20,
    color: '#111111',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  emptySection: { paddingVertical: 14, color: '#555555', fontSize: 15, lineHeight: 22 },
  reminderWarning: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#a12622',
    borderRadius: 4,
    padding: 12,
    color: '#7d1d19',
    fontSize: 15,
    lineHeight: 22,
  },
  carryCard: {
    minHeight: 96,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cccccc',
    paddingVertical: 14,
  },
  carryCardHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  situation: { flex: 1, color: '#111111', fontSize: 17, fontWeight: '600', lineHeight: 24 },
  status: { color: '#555555', fontSize: 13, lineHeight: 20, textAlign: 'right' },
  category: { marginTop: 4, color: '#333333', fontSize: 15, lineHeight: 22 },
  schedule: { marginTop: 2, color: '#555555', fontSize: 14, lineHeight: 20 },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  emptyHeading: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    textAlign: 'center',
  },
  emptyMessage: {
    maxWidth: 320,
    marginTop: 8,
    color: '#555555',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  newCarryButton: {
    minHeight: 52,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderRadius: 4,
    backgroundColor: '#111111',
    paddingHorizontal: 16,
  },
  newCarryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', lineHeight: 24 },
  newCarryPressed: { opacity: 0.75 },
  pressed: { opacity: 0.65, backgroundColor: '#f2f2f2' },
});
