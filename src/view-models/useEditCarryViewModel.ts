/**
 * This hook loads an upcoming Carry into an editable form.
 * It manages validation, passage preview, and saving changes.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { BibleRepository } from '../repositories/BibleRepository';
import type { CarryRepository } from '../repositories/CarryRepository';
import type { NotificationService } from '../services/NotificationService';
import { updateCarryRecord } from '../services/updateCarryRecord';
import type { BiblePassage } from '../models/BiblePassage';
import type { Carry } from '../models/Carry';
import type { Category } from '../models/Category';
import type { PassageSelection } from '../models/PassageSelection';
import { getCarryStatus } from '../models/getCarryStatus';
import {
  clearFieldError,
  sameSelection,
  validationMessage,
  type CarryFormDraft,
  type CarryFormErrors,
} from './CarryFormState';
import type { LoadState } from './LoadState';
import { reminderFeedback } from './reminderFeedback';
import { usePassagePreview } from './usePassagePreview';

export type EditCarryLoadState = 'loading' | 'error' | 'not_found' | 'not_upcoming' | 'ready';

export interface EditCarryViewModelOptions {
  readonly bibleRepository: BibleRepository;
  readonly carryRepository: CarryRepository;
  readonly notifications: NotificationService;
  readonly carryId: string;
  readonly selection?: PassageSelection;
  readonly createId: () => string;
  readonly now: () => Date;
}

export interface EditCarryViewModel {
  readonly loadState: EditCarryLoadState;
  readonly retry: () => void;
  readonly draft: CarryFormDraft | null;
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

/** Load one upcoming Carry and keep its editable draft local while Scripture is browsed. */
export function useEditCarryViewModel({
  bibleRepository,
  carryRepository,
  notifications,
  carryId,
  selection,
  createId,
  now,
}: EditCarryViewModelOptions): EditCarryViewModel {
  const [categoryId] = useState(() => createId());
  const [loadState, setLoadState] = useState<EditCarryLoadState>('loading');
  const [draft, setDraft] = useState<CarryFormDraft | null>(null);
  const [categories, setCategories] = useState<readonly Category[]>([]);
  const [categoryLoadFailed, setCategoryLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [errors, setErrors] = useState<CarryFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCarry, setSavedCarry] = useState<Carry | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  const mounted = useRef(false);
  const saving = useRef(false);
  const saved = useRef<Carry | null>(null);
  const hydratedCarryId = useRef<string | null>(null);
  const [appliedSelection, setAppliedSelection] = useState<PassageSelection | null>(null);
  const passagePreview = usePassagePreview({ bibleRepository, selection: draft?.passage ?? null });

  // Apply a picker result after prefill while preserving the rest of the local draft.
  if (selection === undefined) {
    if (appliedSelection !== null) setAppliedSelection(null);
  } else if (
    draft !== null &&
    !isSaving &&
    savedCarry === null &&
    (appliedSelection === null || !sameSelection(appliedSelection, selection))
  ) {
    const nextSelection = { ...selection };
    setAppliedSelection(nextSelection);
    if (!sameSelection(draft.passage, nextSelection)) {
      setDraft((current) => (current === null ? current : { ...current, passage: nextSelection }));
      setErrors((current) => clearFieldError(current, 'passage'));
      setSaveError(null);
    }
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCarry(): Promise<void> {
      try {
        const [carryResult, categoriesResult] = await Promise.all([
          carryRepository.findById(carryId),
          carryRepository.getCategories(),
        ]);
        if (!active) return;

        if (!carryResult.ok) {
          setLoadState('error');
          return;
        }
        if (carryResult.value === null) {
          setLoadState('not_found');
          return;
        }

        if (getCarryStatus(carryResult.value, now()) !== 'upcoming') {
          setLoadState('not_upcoming');
          return;
        }
        if (!categoriesResult.ok) {
          setCategoryLoadFailed(true);
          setLoadState('error');
          return;
        }

        setCategories(categoriesResult.value);
        setCategoryLoadFailed(false);
        if (hydratedCarryId.current !== carryId) {
          const carry = carryResult.value;
          const categoryName =
            categoriesResult.value.find((category) => category.id === carry.categoryId)?.name ?? '';
          hydratedCarryId.current = carryId;
          setDraft({
            categoryName,
            situation: carry.situation,
            scheduledAt: new Date(carry.scheduledAt.getTime()),
            passage: { ...carry.passage },
            ifThenIntention: carry.ifThenIntention,
          });
        }
        setLoadState('ready');
      } catch {
        if (active) {
          setCategoryLoadFailed(true);
          setLoadState('error');
        }
      }
    }

    void loadCarry();
    return () => {
      active = false;
    };
  }, [carryId, carryRepository, loadAttempt, now]);

  const retry = useCallback((): void => {
    if (saving.current) return;
    setCategoryLoadFailed(false);
    setLoadState('loading');
    setLoadAttempt((current) => current + 1);
  }, []);

  const onChangeCategory = useCallback((value: string): void => {
    if (saving.current || saved.current !== null) return;
    setDraft((current) => (current === null ? current : { ...current, categoryName: value }));
    setErrors((current) => clearFieldError(current, 'categoryName'));
    setSaveError(null);
  }, []);
  const onChangeSituation = useCallback((value: string): void => {
    if (saving.current || saved.current !== null) return;
    setDraft((current) => (current === null ? current : { ...current, situation: value }));
    setErrors((current) => clearFieldError(current, 'situation'));
    setSaveError(null);
  }, []);
  const onChangeIntention = useCallback((value: string): void => {
    if (saving.current || saved.current !== null) return;
    setDraft((current) => (current === null ? current : { ...current, ifThenIntention: value }));
    setErrors((current) => clearFieldError(current, 'ifThenIntention'));
    setSaveError(null);
  }, []);
  const onChangeSchedule = useCallback((value: Date): void => {
    if (saving.current || saved.current !== null) return;
    setDraft((current) =>
      current === null ? current : { ...current, scheduledAt: new Date(value.getTime()) },
    );
    setErrors((current) => clearFieldError(current, 'scheduledAt'));
    setSaveError(null);
  }, []);

  /** Lock immediately so two taps before a rerender cannot start concurrent updates. */
  const save = useCallback(async (): Promise<void> => {
    if (saving.current || saved.current !== null || draft === null) return;
    saving.current = true;
    setIsSaving(true);
    setErrors({});
    setSaveError(null);

    try {
      const result = await updateCarryRecord(
        {
          ...draft,
          scheduledAt: draft.scheduledAt ?? new Date(Number.NaN),
        },
        {
          bibleRepository,
          carryRepository,
          notifications,
          carryId,
          categoryId,
          now,
        },
      );

      if (!mounted.current) return;
      if (!result.ok) {
        switch (result.code) {
          case 'validation': {
            const nextErrors: CarryFormErrors = {};
            for (const issue of result.issues) nextErrors[issue.field] = validationMessage(issue);
            setErrors(nextErrors);
            return;
          }
          case 'not_found':
            setLoadState('not_found');
            return;
          case 'not_upcoming':
            setLoadState('not_upcoming');
            return;
          case 'unavailable':
            setSaveError(
              result.source === 'bible'
                ? 'The selected passage could not be checked. Please try again.'
                : 'Your Carry could not be saved. Please try again.',
            );
            return;
        }
      }

      // Keep the saved record locked even when reminder sync reports a failure.
      saved.current = result.carry;
      setReminderMessage(reminderFeedback(result.reminderStatus));
      setSavedCarry(result.carry);
    } catch {
      if (mounted.current) setSaveError('Something went wrong while saving. Please try again.');
    } finally {
      saving.current = false;
      if (mounted.current) setIsSaving(false);
    }
  }, [bibleRepository, carryId, carryRepository, notifications, categoryId, draft, now]);

  return {
    loadState,
    retry,
    draft,
    categories,
    categoryLoadFailed,
    onRetryCategories: retry,
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
