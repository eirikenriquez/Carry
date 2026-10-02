import { useCallback, useEffect, useRef, useState } from 'react';

import type { BibleRepository } from '../../../application/ports/BibleRepository';
import type { CarryRepository } from '../../../application/ports/CarryRepository';
import {
  createCarryRecord,
  type CreateCarryRecordValidationIssue,
} from '../../../application/services/createCarryRecord';
import type { BiblePassage } from '../../../domain/entities/BiblePassage';
import type { Carry } from '../../../domain/entities/Carry';
import type { Category } from '../../../domain/entities/Category';
import type { PassageSelection } from '../../../domain/entities/PassageSelection';
import type { CarryLoadState } from './CarryLoadState';

export interface CreateCarryViewModelOptions {
  readonly bibleRepository: BibleRepository;
  readonly carryRepository: CarryRepository;
  readonly initialSelection: PassageSelection;
  readonly createId: () => string;
  readonly now: () => Date;
}

export interface CreateCarryDraftState {
  readonly categoryName: string;
  readonly situation: string;
  readonly scheduledAt: Date | null;
  readonly passage: PassageSelection;
  readonly ifThenIntention: string;
}

export interface CreateCarryViewModel {
  readonly draft: CreateCarryDraftState;
  readonly categories: readonly Category[];
  readonly categoryLoadFailed: boolean;
  readonly onRetryCategories: () => void;
  readonly passagePreview: CarryLoadState<BiblePassage>;
  readonly onRetryPassage: () => void;
  readonly errors: Partial<Record<CreateCarryRecordValidationIssue['field'], string>>;
  readonly saveError: string | null;
  readonly isSaving: boolean;
  readonly savedCarry: Carry | null;
  readonly onChangeCategory: (value: string) => void;
  readonly onChangeSituation: (value: string) => void;
  readonly onChangeIntention: (value: string) => void;
  readonly onChangeSchedule: (value: Date) => void;
  readonly save: () => Promise<void>;
}

const validationMessage = (issue: CreateCarryRecordValidationIssue): string => {
  switch (issue.code) {
    case 'invalid_date':
      return 'Choose a valid schedule date.';
    case 'must_be_future':
      return 'Choose a time in the future.';
    case 'invalid_selection':
      return 'Choose a valid Bible passage.';
    case 'required':
      switch (issue.field) {
        case 'categoryName':
          return 'Choose or enter a category.';
        case 'situation':
          return 'Add the situation you want to prepare for.';
        case 'scheduledAt':
          return 'Choose a schedule date.';
        case 'passage':
          return 'Choose a Bible passage.';
        case 'ifThenIntention':
          return 'Add your if–then intention.';
      }
  }
  return 'Check this field.';
};

function clearFieldError(
  current: Partial<Record<CreateCarryRecordValidationIssue['field'], string>>,
  field: CreateCarryRecordValidationIssue['field'],
): Partial<Record<CreateCarryRecordValidationIssue['field'], string>> {
  if (current[field] === undefined) return current;
  const next = { ...current };
  delete next[field];
  return next;
}

function sameSelection(left: PassageSelection, right: PassageSelection): boolean {
  return left.startVerseKey === right.startVerseKey && left.endVerseKey === right.endVerseKey;
}

/** Coordinate a new Carry draft, independent reads, and one guarded save attempt at a time. */
export function useCreateCarryViewModel({
  bibleRepository,
  carryRepository,
  initialSelection,
  createId,
  now,
}: CreateCarryViewModelOptions): CreateCarryViewModel {
  const [identity] = useState(() => ({ carryId: createId(), categoryId: createId() }));
  const [draft, setDraft] = useState<CreateCarryDraftState>(() => ({
    categoryName: '',
    situation: '',
    scheduledAt: null,
    passage: { ...initialSelection },
    ifThenIntention: '',
  }));
  const [categories, setCategories] = useState<readonly Category[]>([]);
  const [categoryLoadFailed, setCategoryLoadFailed] = useState(false);
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [appliedSelection, setAppliedSelection] = useState(() => ({ ...initialSelection }));
  const [previewRecord, setPreviewRecord] = useState<{
    readonly startVerseKey: string;
    readonly endVerseKey: string;
    readonly attempt: number;
    readonly state: CarryLoadState<BiblePassage>;
  } | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<CreateCarryRecordValidationIssue['field'], string>>
  >({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCarry, setSavedCarry] = useState<Carry | null>(null);

  const mounted = useRef(false);
  const saving = useRef(false);
  const saved = useRef<Carry | null>(null);

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

  const passageStartVerseKey = draft.passage.startVerseKey;
  const passageEndVerseKey = draft.passage.endVerseKey;

  useEffect(() => {
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
  }, [bibleRepository, passageStartVerseKey, passageEndVerseKey, previewAttempt]);

  const onRetryCategories = useCallback((): void => {
    setCategoryLoadFailed(false);
    setCategoryAttempt((current) => current + 1);
  }, []);

  const onRetryPassage = useCallback((): void => {
    setPreviewAttempt((current) => current + 1);
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

      if (!mounted.current) return;
      if (!result.ok) {
        if (result.code === 'validation') {
          const nextErrors: Partial<Record<CreateCarryRecordValidationIssue['field'], string>> = {};
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
      setSavedCarry(result.carry);
    } catch {
      if (mounted.current) setSaveError('Something went wrong while saving. Please try again.');
    } finally {
      saving.current = false;
      if (mounted.current) setIsSaving(false);
    }
  }, [bibleRepository, carryRepository, draft, identity, now]);

  const passagePreview: CarryLoadState<BiblePassage> =
    previewRecord !== null &&
    previewRecord.startVerseKey === draft.passage.startVerseKey &&
    previewRecord.endVerseKey === draft.passage.endVerseKey &&
    previewRecord.attempt === previewAttempt
      ? previewRecord.state
      : { status: 'loading' };

  return {
    draft,
    categories,
    categoryLoadFailed,
    onRetryCategories,
    passagePreview,
    onRetryPassage,
    errors,
    saveError,
    isSaving,
    savedCarry,
    onChangeCategory,
    onChangeSituation,
    onChangeIntention,
    onChangeSchedule,
    save,
  };
}
