import { useCallback, useEffect, useState } from 'react';

import type { CarryRepository } from '../../../application/ports/CarryRepository';
import type { Carry } from '../../../domain/entities/Carry';
import type { CarryLoadState } from './CarryLoadState';

export interface CarryListItem {
  readonly carry: Carry;
  readonly categoryName: string;
}

/** Reload saved records when their screen opens, ignoring reads after it loses focus. */
export function useCarryListViewModel(repository: CarryRepository, isFocused: boolean) {
  const [state, setState] = useState<CarryLoadState<readonly CarryListItem[]>>({
    status: 'loading',
  });
  const [attempt, setAttempt] = useState(0);
  const [scope, setScope] = useState({ repository, isFocused });
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  // Reset before rendering a new focus scope so an old list cannot briefly reappear.
  if (scope.repository !== repository || scope.isFocused !== isFocused) {
    setScope({ repository, isFocused });
    setState({ status: 'loading' });
  }

  useEffect(() => {
    if (!isFocused) return undefined;
    let active = true;

    async function load(): Promise<void> {
      try {
        const [carries, categories] = await Promise.all([
          repository.findAll(),
          repository.getCategories(),
        ]);
        if (!active) return;
        if (!carries.ok || !categories.ok) {
          setState({ status: 'error' });
          return;
        }
        const names = new Map(categories.value.map((category) => [category.id, category.name]));
        setState({
          status: 'ready',
          data: carries.value.map((carry) => ({
            carry,
            categoryName: names.get(carry.categoryId) ?? 'Unknown category',
          })),
        });
      } catch {
        if (active) setState({ status: 'error' });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [repository, isFocused, attempt]);

  return { state, retry };
}
