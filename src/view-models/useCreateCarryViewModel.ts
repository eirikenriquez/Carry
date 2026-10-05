/**
 * This hook manages a new Carry form and its supporting reads.
 * It validates the draft, saves the Carry, and schedules its reminder.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { BibleRepository } from '../repositories/BibleRepository';
import type { CarryRepository } from '../repositories/CarryRepository';
import type { NotificationService } from '../services/NotificationService';
import { createCarryRecord } from '../services/createCarryRecord';
import { scheduleCarryReminder } from '../services/scheduleCarryReminder';
import type { BiblePassage } from '../models/BiblePassage';
import type { Carry } from '../models/Carry';
import type { Category } from '../models/Category';
import type { PassageSelection } from '../models/PassageSelection';
import { clearFieldError, sameSelection, validationMessage } from './CarryFormState';
import type { CarryFormDraft, CarryFormErrors } from './CarryFormState';
import type { LoadState } from './LoadState';
import { reminderFeedback } from './reminderFeedback';
import { usePassagePreview } from './usePassagePreview';

export interface CreateCarryViewModelOptions {
  readonly bibleRepository: BibleRepository;
  readonly carryRepository: CarryRepository;
  readonly notifications: NotificationService;
  readonly initialSelection: PassageSelection;
  readonly createId: () => string;
  readonly now: () => Date;
}

export interface CreateCarryViewModel {
  readonly draft: CarryFormDraft;
  readonly categories: readonly Category[];
  readonly categoryLoadFailed: boolean;
  readonly onRetryCategories: () => void;
  readonly passagePreview: LoadState<BiblePassage>;
  readonly onRetryPassage: () => void;
  readonly errors: CarryFormErrors;
  readonly saveError: string | null;
  readonly isSaving: boolean;
  readonly savedCarry: Carry | null;
  readonly reminderMessage: string | null;
  readonly onChangeCategory: (value: string) => void;
  readonly onChangeSituation: (value: string) => void;
  readonly onChangeIntention: (value: string) => void;
  readonly onChangeSchedule: (value: Date) => void;
  readonly save: () => Promise<void>;
}

/** Coordinate a new Carry draft, independent reads, and one guarded save attempt at a time. */
export function useCreateCarryViewModel({
  bibleRepository,
  carryRepository,
  notifications,
  initialSelection,
  createId,
  now,
}: CreateCarryViewModelOptions): CreateCarryViewModel {
  const [identity] = useState(() => ({ carryId: createId(), categoryId: createId() }));
  const [draft, setDraft] = useState<CarryFormDraft>(() => ({
    categoryName: '',
    situation: '',
    scheduledAt: null,
    passage: { ...initialSelection },
    ifThenIntention: '',
  }));
  const [categories, setCategories] = useState<readonly Category[]>([]);
  const [categoryLoadFailed, setCategoryLoadFailed] = useState(false);
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const [appliedSelection, setAppliedSelection] = useState(() => ({ ...initialSelection }));
  const [errors, setErrors] = useState<CarryFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCarry, setSavedCarry] = useState<Carry | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  const mounted = useRef(false);
  const saving = useRef(false);
  const saved = useRef<Carry | null>(null);
  const passagePreview = usePassagePreview({ bibleRepository, selection: draft.passage });

  // Sync picker changes during render so a new preview never belongs to an old selection.
  if (!isSaving && savedCarry === null && !sameSelection(appliedSelection, initialSelection)) {
    setAppliedSelection({ ...initialSelection });
    setDraft((current) => ({ ...current, passage: initialSelection }));
    setErrors((current) => clearFieldError(current, 'passage'));
    setSaveError(null);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCategories(): Promise<void> {
      try {
        const result = await carryRepository.getCategories();
        if (!active) return;
        if (!result.ok) {
          setCategoryLoadFailed(true);
          return;
        }
        setCategories(result.value);
        setCategoryLoadFailed(false);
      } catch {
        if (active) setCategoryLoadFailed(true);
      }
    }

    void loadCategories();
    return () => {
      active = false;
    };
  }, [carryRepository, categoryAttempt]);

  const onRetryCategories = useCallback((): void => {
    setCategoryLoadFailed(false);
    setCategoryAttempt((current) => current + 1);
  }, []);

  const onChangeCategory = useCallback((value: string): void => {
    if (saving.current || saved.current !== null) return;
    setDraft((current) => ({ ...current, categoryName: value }));
    setErrors((current) => clearFieldError(current, 'categoryName'));
    setSaveError(null);
  }, []);
  const onChangeSituation = useCallback((value: string): void => {
    if (saving.current || saved.current !== null) return;
    setDraft((current) => ({ ...current, situation: value }));
    setErrors((current) => clearFieldError(current, 'situation'));
    setSaveError(null);
  }, []);
  const onChangeIntention = useCallback((value: string): void => {
    if (saving.current || saved.current !== null) return;
    setDraft((current) => ({ ...current, ifThenIntention: value }));
    setErrors((current) => clearFieldError(current, 'ifThenIntention'));
    setSaveError(null);
  }, []);
  const onChangeSchedule = useCallback((value: Date): void => {
    if (saving.current || saved.current !== null) return;
    setDraft((current) => ({ ...current, scheduledAt: new Date(value.getTime()) }));
    setErrors((current) => clearFieldError(current, 'scheduledAt'));
    setSaveError(null);
  }, []);

  /** Lock immediately so two taps before a React rerender cannot start two writes. */
  const save = useCallback(async (): Promise<void> => {
    if (saving.current || saved.current !== null) return;
    saving.current = true;
    setIsSaving(true);
    setErrors({});
    setSaveError(null);

    try {
      const result = await createCarryRecord(
        {
          ...draft,
          scheduledAt: draft.scheduledAt ?? new Date(Number.NaN),
        },
        {
          bibleRepository,
          carryRepository,
          carryId: identity.carryId,
          categoryId: identity.categoryId,
          now,
        },
      );

      if (!result.ok) {
        if (!mounted.current) return;
        if (result.code === 'validation') {
          const nextErrors: CarryFormErrors = {};
          for (const issue of result.issues) nextErrors[issue.field] = validationMessage(issue);
          setErrors(nextErrors);
        } else {
          setSaveError(
            result.source === 'bible'
              ? 'The selected passage could not be checked. Please try again.'
              : 'Your Carry could not be saved. Please try again.',
          );
        }
        return;
      }

      saved.current = result.carry;
      // Storage has succeeded. A reminder failure must not invite another Carry save.
      const reminder = await scheduleCarryReminder(
        result.carry,
        carryRepository,
        notifications,
        now,
      );
      if (!mounted.current) return;
      setReminderMessage(reminderFeedback(reminder.status));
      setSavedCarry(
        reminder.status === 'scheduled'
          ? { ...result.carry, reminderId: reminder.reminderId }
          : result.carry,
      );
    } catch {
      if (mounted.current) setSaveError('Something went wrong while saving. Please try again.');
    } finally {
      saving.current = false;
      if (mounted.current) setIsSaving(false);
    }
  }, [bibleRepository, carryRepository, notifications, draft, identity, now]);

  return {
    draft,
    categories,
    categoryLoadFailed,
    onRetryCategories,
    passagePreview: passagePreview.state,
    onRetryPassage: passagePreview.retry,
    errors,
    saveError,
    isSaving,
    savedCarry,
    reminderMessage,
    onChangeCategory,
    onChangeSituation,
    onChangeIntention,
    onChangeSchedule,
    save,
  };
}
