import { useEffect } from 'react';
import { useIsFocused, usePreventRemove } from '@react-navigation/native';
import { randomUUID } from 'expo-crypto';
import { Pressable, Text, View } from 'react-native';

import type { BibleRepository } from '../application/ports/BibleRepository';
import type { CarryRepository } from '../application/ports/CarryRepository';
import type { NotificationService } from '../application/ports/NotificationService';
import type { PassageSelection } from '../domain/entities/PassageSelection';
import { useCreateCarryViewModel } from '../features/carry/view-models/useCreateCarryViewModel';
import { useEditCarryViewModel } from '../features/carry/view-models/useEditCarryViewModel';
import { useCarryListViewModel } from '../features/carry/view-models/useCarryListViewModel';
import { useCarryDetailViewModel } from '../features/carry/view-models/useCarryDetailViewModel';
import { useCarryStatusClock } from '../features/carry/view-models/useCarryStatusClock';
import { CarryFormScreen } from '../features/carry/views/CarryFormScreen';
import { CarryListScreen } from '../features/carry/views/CarryListScreen';
import { CarryDetailScreen } from '../features/carry/views/CarryDetailScreen';
import { CarryLoadError, CarryLoadFeedback } from '../features/carry/views/CarryLoadFeedback';

const currentTime = () => new Date();

interface CreateCarryFlowProps {
  readonly repository: CarryRepository;
  readonly bibleRepository: BibleRepository;
  readonly selection: PassageSelection;
  readonly notifications: NotificationService;
  readonly onSaved: (carryId: string, reminderMessage: string | null) => void;
  readonly onCancel: () => void;
  readonly onChangePassage: () => void;
}

/** Keep the draft mounted under passage picking and navigate only after a confirmed save. */
export function CreateCarryFlow({
  repository,
  bibleRepository,
  selection,
  notifications,
  onSaved,
  onCancel,
  onChangePassage,
}: CreateCarryFlowProps) {
  const model = useCreateCarryViewModel({
    carryRepository: repository,
    notifications,
    bibleRepository,
    initialSelection: selection,
    createId: randomUUID,
    now: currentTime,
  });

  // A database transaction cannot be cancelled; wait before leaving this draft.
  usePreventRemove(model.isSaving, () => undefined);
  useEffect(() => {
    if (model.savedCarry) onSaved(model.savedCarry.id, model.reminderMessage);
  }, [model.savedCarry, model.reminderMessage, onSaved]);

  return (
    <CarryFormScreen
      draft={model.draft}
      categories={model.categories}
      categoryLoadFailed={model.categoryLoadFailed}
      onRetryCategories={model.onRetryCategories}
      passagePreview={model.passagePreview}
      onRetryPassage={model.onRetryPassage}
      errors={model.errors}
      saveError={model.saveError}
      isSaving={model.isSaving}
      onChangeCategory={model.onChangeCategory}
      onChangeSituation={model.onChangeSituation}
      onChangeIntention={model.onChangeIntention}
      onChangeSchedule={model.onChangeSchedule}
      onChangePassage={onChangePassage}
      onSave={() => void model.save()}
      onCancel={onCancel}
    />
  );
}

interface EditCarryFlowProps {
  readonly repository: CarryRepository;
  readonly bibleRepository: BibleRepository;
  readonly notifications: NotificationService;
  readonly carryId: string;
  readonly selection?: PassageSelection;
  readonly onSaved: (reminderMessage: string | null) => void;
  readonly onCancel: () => void;
  readonly onChangePassage: () => void;
}

/** Prefill a separate edit draft and keep it mounted underneath Scripture picking. */
export function EditCarryFlow({
  repository,
  bibleRepository,
  notifications,
  carryId,
  selection,
  onSaved,
  onCancel,
  onChangePassage,
}: EditCarryFlowProps) {
  const model = useEditCarryViewModel({
    carryRepository: repository,
    bibleRepository,
    notifications,
    carryId,
    selection,
    createId: randomUUID,
    now: currentTime,
  });

  usePreventRemove(model.isSaving, () => undefined);
  useEffect(() => {
    if (model.savedCarry) onSaved(model.reminderMessage);
  }, [model.savedCarry, model.reminderMessage, onSaved]);

  if (model.loadState === 'loading') return <CarryLoadFeedback resourceLabel="Carry" />;
  if (model.loadState === 'error') {
    return <CarryLoadError resourceLabel="Carry" onRetry={model.retry} />;
  }
  if (!model.draft || model.loadState !== 'ready') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text accessibilityRole="alert">
          {model.loadState === 'not_found'
            ? 'This Carry no longer exists.'
            : 'Only upcoming Carries can be edited.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, marginTop: 16 }}
        >
          <Text>Back to Carry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CarryFormScreen
      mode="edit"
      draft={model.draft}
      categories={model.categories}
      categoryLoadFailed={model.categoryLoadFailed}
      onRetryCategories={model.onRetryCategories}
      passagePreview={model.passagePreview}
      onRetryPassage={model.onRetryPassage}
      errors={model.errors}
      saveError={model.saveError}
      isSaving={model.isSaving}
      onChangeCategory={model.onChangeCategory}
      onChangeSituation={model.onChangeSituation}
      onChangeIntention={model.onChangeIntention}
      onChangeSchedule={model.onChangeSchedule}
      onChangePassage={onChangePassage}
      onSave={() => void model.save()}
      onCancel={onCancel}
    />
  );
}

interface CarryListFlowProps {
  readonly repository: CarryRepository;
  readonly reminderMessage?: string;
  readonly onClearReminderMessage: () => void;
  readonly onOpenCarry: (carryId: string) => void;
  readonly onBrowseBible: () => void;
}

/** Refresh the lightweight reopening list each time it receives focus. */
export function CarryListFlow({
  repository,
  reminderMessage,
  onClearReminderMessage,
  onOpenCarry,
  onBrowseBible,
}: CarryListFlowProps) {
  const isFocused = useIsFocused();
  const model = useCarryListViewModel(repository, isFocused);
  const now = useCarryStatusClock(isFocused, model.state);
  useEffect(() => {
    if (!isFocused && reminderMessage) onClearReminderMessage();
  }, [isFocused, reminderMessage, onClearReminderMessage]);
  return (
    <CarryListScreen
      state={model.state}
      now={now}
      reminderMessage={reminderMessage}
      onRetry={model.retry}
      onOpenCarry={onOpenCarry}
      onBrowseBible={onBrowseBible}
    />
  );
}

interface CarryDetailFlowProps {
  readonly repository: CarryRepository;
  readonly bibleRepository: BibleRepository;
  readonly notifications: NotificationService;
  readonly carryId: string;
  readonly reminderMessage?: string;
  readonly onViewCarries: (reminderMessage?: string) => void;
  readonly onEdit: () => void;
}

/** Resolve saved data again when detail regains focus after an edit. */
export function CarryDetailFlow({
  repository,
  bibleRepository,
  notifications,
  carryId,
  reminderMessage,
  onViewCarries,
  onEdit,
}: CarryDetailFlowProps) {
  const isFocused = useIsFocused();
  const model = useCarryDetailViewModel(
    repository,
    bibleRepository,
    notifications,
    carryId,
    isFocused,
  );
  const now = useCarryStatusClock(isFocused, model.state);
  usePreventRemove(model.isDeleting, () => undefined);
  useEffect(() => {
    if (model.deletedCarryId !== null) onViewCarries(model.deleteWarning ?? undefined);
  }, [model.deletedCarryId, model.deleteWarning, onViewCarries]);

  return (
    <CarryDetailScreen
      state={model.state}
      now={now}
      reminderMessage={reminderMessage}
      onRetry={model.retry}
      onViewCarries={onViewCarries}
      onEdit={onEdit}
      onDelete={() => void model.deleteCarry()}
      isDeleting={model.isDeleting}
      deleteError={model.deleteError}
    />
  );
}
