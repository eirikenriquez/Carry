import { useCallback, useEffect, useState } from 'react';

import type { BibleRepository } from '../../../application/ports/BibleRepository';
import type { CarryRepository } from '../../../application/ports/CarryRepository';
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
  carryId: string,
  isFocused: boolean,
) {
  const [state, setState] = useState<CarryLoadState<CarryDetail>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [scope, setScope] = useState({ repository, bibleRepository, carryId, isFocused });
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  // Do not show the previous Carry while a different ID or focus scope is loading.
  if (
    scope.repository !== repository ||
    scope.bibleRepository !== bibleRepository ||
    scope.carryId !== carryId ||
    scope.isFocused !== isFocused
  ) {
    setScope({ repository, bibleRepository, carryId, isFocused });
    setState({ status: 'loading' });
  }

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

  return { state, retry };
}
