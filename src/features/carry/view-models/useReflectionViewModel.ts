import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { CarryRepository } from '../../../application/ports/CarryRepository';
import { saveCarryReflection } from '../../../application/services/saveCarryReflection';
import type { Carry } from '../../../domain/entities/Carry';
import { getCarryStatus } from '../../../domain/rules/getCarryStatus';

export interface ReflectionDraft {
  readonly alignmentRating: number | null;
  readonly whatOccurred: string;
  readonly insight: string;
}

export type ReflectionField = keyof ReflectionDraft;
export type ReflectionFieldErrors = Partial<Record<ReflectionField, string>>;
export type ReflectionLoadState =
  'loading' | 'ready' | 'not_found' | 'not_ready' | 'already_reflected' | 'error';

export interface ReflectionViewModelOptions {
  readonly carryRepository: CarryRepository;
  readonly carryId: string;
  readonly createId: () => string;
  readonly now: () => Date;
}

export interface ReflectionViewModel {
  readonly draft: ReflectionDraft;
  readonly fieldErrors: ReflectionFieldErrors;
  readonly saveError: string | null;
  readonly loadState: ReflectionLoadState;
  readonly carry: Carry | null;
  readonly isSaving: boolean;
  readonly savedCarry: Carry | null;
  readonly onChangeRating: (value: number | null) => void;
  readonly onChangeWhatOccurred: (value: string) => void;
  readonly onChangeInsight: (value: string) => void;
  readonly retry: () => void;
  readonly save: () => Promise<void>;
}

const emptyDraft: ReflectionDraft = {
  alignmentRating: null,
  whatOccurred: '',
  insight: '',
};

/** Keep an existing Carry's reflection draft local until its guarded save succeeds. */
export function useReflectionViewModel({
  carryRepository,
  carryId,
  createId,
  now,
}: ReflectionViewModelOptions): ReflectionViewModel {
  const [scope, setScope] = useState({ carryRepository, carryId });
  const [draft, setDraft] = useState<ReflectionDraft>(emptyDraft);
  const [fieldErrors, setFieldErrors] = useState<ReflectionFieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<ReflectionLoadState>('loading');
  const [carry, setCarry] = useState<Carry | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCarry, setSavedCarry] = useState<Carry | null>(null);
  const saving = useRef(false);
  const saved = useRef<Carry | null>(null);
  const operationGeneration = useRef(0);
  const activeScope = useRef<typeof scope | null>(null);

  if (scope.carryRepository !== carryRepository || scope.carryId !== carryId) {
    setScope({ carryRepository, carryId });
    setDraft(emptyDraft);
    setFieldErrors({});
    setSaveError(null);
    setLoadState('loading');
    setCarry(null);
    setIsSaving(false);
    setSavedCarry(null);
  }

  // Invalidate outstanding reads and saves when this hook changes Carry scope or unmounts.
  useLayoutEffect(() => {
    activeScope.current = scope;
    saving.current = false;
    saved.current = null;
    return () => {
      if (activeScope.current === scope) activeScope.current = null;
      operationGeneration.current += 1;
      saving.current = false;
    };
  }, [scope]);

  useEffect(() => {
    let active = true;

    async function loadCarry(): Promise<void> {
      try {
        const result = await carryRepository.findById(carryId);
        if (!active) return;
        if (!result.ok) {
          setLoadState('error');
          return;
        }
        if (result.value === null) {
          setCarry(null);
          setLoadState('not_found');
          return;
        }

        const status = getCarryStatus(result.value, now());
        setCarry(result.value);
        if (status === 'upcoming') {
          setLoadState('not_ready');
        } else if (status === 'completed') {
          setLoadState('already_reflected');
        } else {
          setLoadState('ready');
        }
      } catch {
        if (active) setLoadState('error');
      }
    }

    void loadCarry();
    return () => {
      active = false;
    };
  }, [carryId, carryRepository, loadAttempt, now]);

  const canEditDraft = useCallback(
    (): boolean =>
      activeScope.current === scope &&
      loadState === 'ready' &&
      !saving.current &&
      saved.current === null,
    [loadState, scope],
  );

  /** Re-read lifecycle state without discarding the user's local draft. */
  const retry = useCallback((): void => {
    if (activeScope.current !== scope || saving.current || saved.current !== null) return;
    setLoadState('loading');
    setLoadAttempt((current) => current + 1);
  }, [scope]);

  const changeRating = useCallback(
    (value: number | null): void => {
      if (!canEditDraft()) return;
      setDraft((current) => ({ ...current, alignmentRating: value }));
      setFieldErrors((current) => clearFieldError(current, 'alignmentRating'));
      setSaveError(null);
    },
    [canEditDraft],
  );

  const onChangeWhatOccurred = useCallback(
    (value: string): void => {
      if (!canEditDraft()) return;
      setDraft((current) => ({ ...current, whatOccurred: value }));
      setFieldErrors((current) => clearFieldError(current, 'whatOccurred'));
      setSaveError(null);
    },
    [canEditDraft],
  );

  const onChangeInsight = useCallback(
    (value: string): void => {
      if (!canEditDraft()) return;
      setDraft((current) => ({ ...current, insight: value }));
      setFieldErrors((current) => clearFieldError(current, 'insight'));
      setSaveError(null);
    },
    [canEditDraft],
  );

  /** Lock synchronously so repeated taps cannot start concurrent save attempts. */
  const save = useCallback(async (): Promise<void> => {
    if (
      activeScope.current !== scope ||
      loadState !== 'ready' ||
      carry?.id !== carryId ||
      saving.current ||
      saved.current !== null
    ) {
      return;
    }

    saving.current = true;
    const generation = ++operationGeneration.current;
    setIsSaving(true);
    setFieldErrors({});
    setSaveError(null);

    try {
      const result = await saveCarryReflection(
        {
          ...draft,
          alignmentRating: draft.alignmentRating ?? 0,
        },
        {
          carryRepository,
          carryId,
          reflectionId: createId(),
          now,
        },
      );
      if (operationGeneration.current !== generation || activeScope.current !== scope) return;

      if (!result.ok) {
        switch (result.code) {
          case 'validation': {
            const nextErrors: ReflectionFieldErrors = {};
            for (const issue of result.issues) {
              if (issue.field === 'alignmentRating') {
                nextErrors.alignmentRating = 'Choose an alignment rating.';
              } else if (issue.field === 'whatOccurred') {
                nextErrors.whatOccurred = 'Describe what happened.';
              } else if (issue.field === 'insight') {
                nextErrors.insight = 'Add an insight.';
              } else if (issue.field === 'id') {
                setSaveError('A reflection could not be prepared. Please try again.');
              }
            }
            setFieldErrors(nextErrors);
            return;
          }
          case 'not_found':
            setCarry(null);
            setLoadState('not_found');
            return;
          case 'not_ready':
            setLoadState('not_ready');
            return;
          case 'already_reflected':
            setLoadState('already_reflected');
            return;
          case 'unavailable':
            setSaveError('Your reflection could not be saved. Please try again.');
            return;
        }
      }

      saved.current = result.carry;
      setCarry(result.carry);
      setSavedCarry(result.carry);
    } catch {
      if (operationGeneration.current === generation && activeScope.current === scope) {
        setSaveError('Your reflection could not be saved. Please try again.');
      }
    } finally {
      if (operationGeneration.current === generation && activeScope.current === scope) {
        saving.current = false;
        setIsSaving(false);
      }
    }
  }, [carry, carryId, carryRepository, createId, draft, loadState, now, scope]);

  return {
    draft,
    fieldErrors,
    saveError,
    loadState,
    carry,
    isSaving,
    savedCarry,
    onChangeRating: changeRating,
    onChangeWhatOccurred,
    onChangeInsight,
    retry,
    save,
  };
}

function clearFieldError(
  current: ReflectionFieldErrors,
  field: ReflectionField,
): ReflectionFieldErrors {
  if (current[field] === undefined) return current;
  const next = { ...current };
  delete next[field];
  return next;
}
