/**
 * This hook loads saved Carries and their category names.
 * It reloads when the list screen gains focus and exposes retry.
 */
import { useCallback, useEffect, useState } from 'react';

import type { CarryRepository } from '../repositories/CarryRepository';
import type { Carry } from '../models/Carry';
import type { CarryStatus } from '../models/CarryStatus';
import { getCarryStatus } from '../models/getCarryStatus';
import type { LoadState } from './LoadState';

export interface CarryListItem {
  readonly carry: Carry;
  readonly categoryName: string;
}

export interface CarryListSection {
  readonly key: CarryStatus;
  readonly data: readonly CarryListItem[];
}

const sectionOrder: readonly CarryStatus[] = ['upcoming', 'readyToReflect', 'completed'];

/** Reload saved records when their screen opens, ignoring reads after it loses focus. */
export function useCarryListViewModel(repository: CarryRepository, isFocused: boolean) {
  const [state, setState] = useState<LoadState<readonly CarryListItem[]>>({
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

/** Group the loaded list using one clock value, keeping its order within each section. */
export function groupCarryListItems(
  items: readonly CarryListItem[],
  now: Date,
): readonly CarryListSection[] {
  const groups: Record<CarryStatus, CarryListItem[]> = {
    upcoming: [],
    readyToReflect: [],
    completed: [],
  };

  for (const item of items) {
    groups[getCarryStatus(item.carry, now)].push(item);
  }

  return sectionOrder.map((key) => ({ key, data: groups[key] }));
}
