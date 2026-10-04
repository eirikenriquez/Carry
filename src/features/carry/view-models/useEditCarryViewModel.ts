import { useCallback, useEffect, useRef, useState } from 'react';

import type { BibleRepository } from '../../../application/ports/BibleRepository';
import type { CarryRepository } from '../../../application/ports/CarryRepository';
import type { NotificationService } from '../../../application/ports/NotificationService';
import { updateCarryRecord } from '../../../application/services/updateCarryRecord';
import type { BiblePassage } from '../../../domain/entities/BiblePassage';
import type { Carry } from '../../../domain/entities/Carry';
import type { Category } from '../../../domain/entities/Category';
import type { PassageSelection } from '../../../domain/entities/PassageSelection';
import { getCarryStatus } from '../../../domain/rules/getCarryStatus';
import {
  clearFieldError,
  sameSelection,
  validationMessage,
  type CarryFormDraft,
  type CarryFormErrors,
} from './CarryFormState';
import type { CarryLoadState } from './CarryLoadState';
import { reminderFeedback } from './reminderFeedback';

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
  readonly passagePreview: CarryLoadState<BiblePassage>;
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
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [previewRecord, setPreviewRecord] = useState<{
    readonly startVerseKey: string;
    readonly endVerseKey: string;
    readonly attempt: number;
    readonly state: CarryLoadState<BiblePassage>;
  } | null>(null);
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

  const passageStartVerseKey = draft?.passage.startVerseKey ?? null;
  const passageEndVerseKey = draft?.passage.endVerseKey ?? null;

  useEffect(() => {
    if (passageStartVerseKey === null || passageEndVerseKey === null) {
      return;
    }

    let active = true;
    const startVerseKey = passageStartVerseKey;
    const endVerseKey = passageEndVerseKey;

    async function loadPassage(): Promise<void> {
      try {
        const result = await bibleRepository.getPassage({ startVerseKey, endVerseKey });
        if (!active) return;
        setPreviewRecord({
          startVerseKey,
          endVerseKey,
          attempt: previewAttempt,
          state: result.ok ? { status: 'ready', data: result.value } : { status: 'error' },
        });
      } catch {
        if (active) {
          setPreviewRecord({
            startVerseKey,
            endVerseKey,
            attempt: previewAttempt,
            state: { status: 'error' },
          });
        }
      }
    }

    void loadPassage();
    return () => {
      active = false;
    };
  }, [bibleRepository, passageEndVerseKey, passageStartVerseKey, previewAttempt]);

  const retry = useCallback((): void => {
    if (saving.current) return;
    setCategoryLoadFailed(false);
    setLoadState('loading');
    setLoadAttempt((current) => current + 1);
  }, []);

  const onRetryPassage = useCallback((): void => {
    setPreviewAttempt((current) => current + 1);
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

  const passagePreview: CarryLoadState<BiblePassage> =
    previewRecord !== null &&
    previewRecord.startVerseKey === passageStartVerseKey &&
    previewRecord.endVerseKey === passageEndVerseKey &&
    previewRecord.attempt === previewAttempt
      ? previewRecord.state
      : { status: 'loading' };

  return {
    loadState,
    retry,
    draft,
    categories,
    categoryLoadFailed,
    onRetryCategories: retry,
    passagePreview,
    onRetryPassage,
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
