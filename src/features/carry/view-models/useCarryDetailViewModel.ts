import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { BibleRepository } from '../../../application/ports/BibleRepository';
import type { CarryRepository } from '../../../application/ports/CarryRepository';
import type { NotificationService } from '../../../application/ports/NotificationService';
import { deleteUpcomingCarry } from '../../../application/services/deleteUpcomingCarry';
import type { BiblePassage } from '../../../domain/entities/BiblePassage';
import type { Carry } from '../../../domain/entities/Carry';
import type { CarryLoadState } from './CarryLoadState';

export interface CarryDetail {
  readonly carry: Carry;
  readonly categoryName: string;
  readonly passage: BiblePassage;
}

/** Reopen a Carry by ID and resolve its Scripture from the separate bundled Bible. */
export function useCarryDetailViewModel(
  repository: CarryRepository,
  bibleRepository: BibleRepository,
  notifications: NotificationService,
  carryId: string,
  isFocused: boolean,
) {
  const [state, setState] = useState<CarryLoadState<CarryDetail>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [scope, setScope] = useState({
    repository,
    bibleRepository,
    notifications,
    carryId,
    isFocused,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletedCarryId, setDeletedCarryId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const deleting = useRef(false);
  const operationGeneration = useRef(0);
  const activeScope = useRef<typeof scope | null>(null);
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  // Do not show the previous Carry while a different ID or focus scope is loading.
  if (
    scope.repository !== repository ||
    scope.bibleRepository !== bibleRepository ||
    scope.notifications !== notifications ||
    scope.carryId !== carryId ||
    scope.isFocused !== isFocused
  ) {
    setScope({ repository, bibleRepository, notifications, carryId, isFocused });
    setState({ status: 'loading' });
    setIsDeleting(false);
    setDeleteError(null);
    setDeletedCarryId(null);
    setDeleteWarning(null);
  }

  // Invalidate old confirmation callbacks as soon as a different screen scope commits.
  useLayoutEffect(() => {
    activeScope.current = scope;
    deleting.current = false;
    return () => {
      if (activeScope.current === scope) activeScope.current = null;
      operationGeneration.current += 1;
    };
  }, [scope]);

  useEffect(() => {
    if (!isFocused) return undefined;
    let active = true;

    async function load(): Promise<void> {
      try {
        const [result, categories] = await Promise.all([
          repository.findById(carryId),
          repository.getCategories(),
        ]);
        if (!active) return;
        if (!result.ok || !result.value || !categories.ok) {
          setState({ status: 'error' });
          return;
        }
        const carry = result.value;
        const passage = await bibleRepository.getPassage(carry.passage);
        if (!active) return;
        if (!passage.ok) {
          setState({ status: 'error' });
          return;
        }
        setState({
          status: 'ready',
          data: {
            carry,
            categoryName:
              categories.value.find((category) => category.id === carry.categoryId)?.name ??
              'Unknown category',
            passage: passage.value,
          },
        });
      } catch {
        if (active) setState({ status: 'error' });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [repository, bibleRepository, carryId, isFocused, attempt]);

  /** Lock immediately so confirmation cannot start overlapping deletes. */
  const deleteCarry = useCallback(async (): Promise<void> => {
    if (
      activeScope.current !== scope ||
      deleting.current ||
      !isFocused ||
      state.status !== 'ready'
    ) {
      return;
    }

    deleting.current = true;
    const generation = ++operationGeneration.current;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteUpcomingCarry(carryId, repository, notifications);
      if (operationGeneration.current !== generation) return;

      if (!result.ok) {
        if (result.code === 'not_upcoming') {
          setDeleteError('This Carry is no longer upcoming, so it was not deleted.');
          setAttempt((current) => current + 1);
        } else {
          setDeleteError('This Carry could not be deleted. Please try again.');
        }
        return;
      }

      setDeleteWarning(
        result.reminderStatus === 'cancel_failed'
          ? 'Carry deleted, but its reminder could not be cancelled. It may still appear.'
          : null,
      );
      setDeletedCarryId(carryId);
    } catch {
      if (operationGeneration.current === generation) {
        setDeleteError('This Carry could not be deleted. Please try again.');
      }
    } finally {
      if (operationGeneration.current === generation) {
        deleting.current = false;
        setIsDeleting(false);
      }
    }
  }, [carryId, isFocused, notifications, repository, scope, state]);

  return { state, retry, isDeleting, deleteError, deleteWarning, deletedCarryId, deleteCarry };
}
