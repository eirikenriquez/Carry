/**
 * Connects Carry screens to their ViewModels and navigation callbacks.
 * Wires form drafts, saving and screen transitions together.
 */
import { useEffect } from 'react';
import { useIsFocused, usePreventRemove } from '@react-navigation/native';
import { randomUUID } from 'expo-crypto';
import { Pressable, Text, View } from 'react-native';

import type { BibleRepository } from '../repositories/BibleRepository';
import type { CarryRepository } from '../repositories/CarryRepository';
import type { NotificationService } from '../services/NotificationService';
import type { PassageSelection } from '../models/PassageSelection';
import { useCreateCarryViewModel } from '../view-models/useCreateCarryViewModel';
import { useEditCarryViewModel } from '../view-models/useEditCarryViewModel';
import { useCarryListViewModel } from '../view-models/useCarryListViewModel';
import { useCarryDetailViewModel } from '../view-models/useCarryDetailViewModel';
import { useCarryStatusClock } from '../view-models/useCarryStatusClock';
import { useReflectionViewModel } from '../view-models/useReflectionViewModel';
import { CarryFormScreen } from '../screens/CarryFormScreen';
import { CarryListScreen } from '../screens/CarryListScreen';
import { CarryDetailScreen } from '../screens/CarryDetailScreen';
import { CarryLoadError, CarryLoadFeedback } from '../components/CarryLoadFeedback';
import { ReflectionFormScreen } from '../screens/ReflectionFormScreen';

interface CreateCarryFlowProps {
  readonly repository: CarryRepository;
  readonly bibleRepository: BibleRepository;
  readonly selection: PassageSelection;
  readonly notifications: NotificationService;
  readonly onSaved: (carryId: string, reminderMessage: string | null) => void;
  readonly onCancel: () => void;
  readonly onChangePassage: () => void;
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

interface ReflectCarryFlowProps {
  readonly repository: CarryRepository;
  readonly carryId: string;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
}

interface CarryListFlowProps {
  readonly repository: CarryRepository;
  readonly reminderMessage?: string;
  readonly onClearReminderMessage: () => void;
  readonly onOpenCarry: (carryId: string) => void;
  readonly onBrowseBible: () => void;
}

interface CarryDetailFlowProps {
  readonly repository: CarryRepository;
  readonly bibleRepository: BibleRepository;
  readonly notifications: NotificationService;
  readonly carryId: string;
  readonly reminderMessage?: string;
  readonly onViewCarries: (reminderMessage?: string) => void;
  readonly onEdit: () => void;
  readonly onReflect: () => void;
}

const currentTime = () => new Date();

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

/** Load the existing Carry and navigate back only after its reflection is saved. */
export function ReflectCarryFlow({
  repository,
  carryId,
  onSaved,
  onCancel,
}: ReflectCarryFlowProps) {
  const model = useReflectionViewModel({
    carryRepository: repository,
    carryId,
    createId: randomUUID,
    now: currentTime,
  });

  // A guarded storage write cannot be cancelled; keep the form mounted until it settles.
  usePreventRemove(model.isSaving, () => undefined);
  useEffect(() => {
    if (model.savedCarry) onSaved();
  }, [model.savedCarry, onSaved]);

  if (model.loadState === 'loading') return <CarryLoadFeedback resourceLabel="Carry" />;
  if (model.loadState === 'error') {
    return <CarryLoadError resourceLabel="Carry" onRetry={model.retry} />;
  }
  if (model.loadState !== 'ready' || model.carry === null) {
    const message =
      model.loadState === 'not_found'
        ? 'This Carry no longer exists.'
        : model.loadState === 'not_ready'
          ? 'This Carry is not ready to reflect yet.'
          : model.loadState === 'already_reflected'
            ? 'This Carry already has a reflection.'
            : 'This Carry is unavailable for reflection.';

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text accessibilityRole="alert">{message}</Text>
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
    <ReflectionFormScreen
      draft={model.draft}
      fieldErrors={model.fieldErrors}
      situation={model.carry.situation}
      ifThenIntention={model.carry.ifThenIntention}
      saveError={model.saveError}
      isSaving={model.isSaving}
      onChangeRating={model.onChangeRating}
      onChangeWhatOccurred={model.onChangeWhatOccurred}
      onChangeInsight={model.onChangeInsight}
      onSave={() => void model.save()}
      onCancel={onCancel}
    />
  );
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

/** Resolve saved data again when detail regains focus after an edit or reflection. */
export function CarryDetailFlow({
  repository,
  bibleRepository,
  notifications,
  carryId,
  reminderMessage,
  onViewCarries,
  onEdit,
  onReflect,
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
      onReflect={onReflect}
      onDelete={() => void model.deleteCarry()}
      isDeleting={model.isDeleting}
      deleteError={model.deleteError}
    />
  );
}
