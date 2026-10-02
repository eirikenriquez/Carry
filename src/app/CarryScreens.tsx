import { useEffect } from 'react';
import { useIsFocused, usePreventRemove } from '@react-navigation/native';
import { randomUUID } from 'expo-crypto';

import type { BibleRepository } from '../application/ports/BibleRepository';
import type { CarryRepository } from '../application/ports/CarryRepository';
import type { PassageSelection } from '../domain/entities/PassageSelection';
import { useCreateCarryViewModel } from '../features/carry/view-models/useCreateCarryViewModel';
import { useCarryListViewModel } from '../features/carry/view-models/useCarryListViewModel';
import { useCarryDetailViewModel } from '../features/carry/view-models/useCarryDetailViewModel';
import { CarryFormScreen } from '../features/carry/views/CarryFormScreen';
import { CarryListScreen } from '../features/carry/views/CarryListScreen';
import { CarryDetailScreen } from '../features/carry/views/CarryDetailScreen';

const currentTime = () => new Date();

interface CreateCarryFlowProps {
  readonly repository: CarryRepository;
  readonly bibleRepository: BibleRepository;
  readonly selection: PassageSelection;
  readonly onSaved: (carryId: string) => void;
  readonly onCancel: () => void;
  readonly onChangePassage: () => void;
}

/** Keep the draft mounted under passage picking and navigate only after a confirmed save. */
export function CreateCarryFlow({
  repository,
  bibleRepository,
  selection,
  onSaved,
  onCancel,
  onChangePassage,
}: CreateCarryFlowProps) {
  const model = useCreateCarryViewModel({
    carryRepository: repository,
    bibleRepository,
    initialSelection: selection,
    createId: randomUUID,
    now: currentTime,
  });

  // A database transaction cannot be cancelled; wait before leaving this draft.
  usePreventRemove(model.isSaving, () => undefined);
  useEffect(() => {
    if (model.savedCarry) onSaved(model.savedCarry.id);
  }, [model.savedCarry, onSaved]);

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

interface CarryListFlowProps {
  readonly repository: CarryRepository;
  readonly onOpenCarry: (carryId: string) => void;
  readonly onBrowseBible: () => void;
}

/** Refresh the lightweight reopening list each time it receives focus. */
export function CarryListFlow({ repository, onOpenCarry, onBrowseBible }: CarryListFlowProps) {
  const model = useCarryListViewModel(repository, useIsFocused());
  return (
    <CarryListScreen
      state={model.state}
      onRetry={model.retry}
      onOpenCarry={onOpenCarry}
      onBrowseBible={onBrowseBible}
    />
  );
}

interface CarryDetailFlowProps {
  readonly repository: CarryRepository;
  readonly bibleRepository: BibleRepository;
  readonly carryId: string;
  readonly onViewCarries: () => void;
}

/** Supply repository-resolved data to the read-only saved Carry screen. */
export function CarryDetailFlow({
  repository,
  bibleRepository,
  carryId,
  onViewCarries,
}: CarryDetailFlowProps) {
  const model = useCarryDetailViewModel(repository, bibleRepository, carryId, useIsFocused());
  return (
    <CarryDetailScreen state={model.state} onRetry={model.retry} onViewCarries={onViewCarries} />
  );
}
