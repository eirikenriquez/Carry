/**
 * Defines storage operations for Carries, categories and reflections.
 * Keeps database details separate from the rest of the app.
 */
import type { Carry } from '../models/Carry';
import type { Category } from '../models/Category';
import type { Reflection } from '../models/Reflection';

export type CarryRepositoryErrorCode =
  'invalid_record' | 'not_upcoming' | 'not_ready' | 'already_reflected' | 'unavailable';

export type CarryRepositoryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: CarryRepositoryErrorCode };

/**
 * Store personal records independently of SQLite and reminder scheduling.
 */
export interface CarryRepository {
  getCategories(): Promise<CarryRepositoryResult<readonly Category[]>>;

  /**
   * Reuse a normalized category name, or create it with the supplied ID.
   */
  getOrCreateCategory(category: Category): Promise<CarryRepositoryResult<Category>>;

  /**
   * Create a reflection-free, reminder-free Carry and its category atomically.
   */
  create(category: Category, carry: Carry): Promise<CarryRepositoryResult<Carry>>;

  /**
   * Update editable Carry fields and its category atomically; return null when the Carry is missing.
   * Supplying a clock checks upcoming eligibility after acquiring the write lock.
   */
  update(
    category: Category,
    carry: Carry,
    now?: () => Date,
  ): Promise<CarryRepositoryResult<Carry | null>>;

  /**
   * Save a Carry and any supplied reflection atomically; omission preserves an existing reflection.
   */
  save(carry: Carry): Promise<CarryRepositoryResult<Carry>>;

  /** Attach one reflection only when the existing Carry is ready and unreflected. */
  recordReflection(
    carryId: string,
    reflection: Reflection,
    now: () => Date,
  ): Promise<CarryRepositoryResult<Carry | null>>;

  /** Update or clear the notification link without recreating a missing Carry. */
  setReminderId(id: string, reminderId: string | null): Promise<CarryRepositoryResult<boolean>>;

  /**
   * Return null when the requested Carry does not exist.
   */
  findById(id: string): Promise<CarryRepositoryResult<Carry | null>>;

  findAll(): Promise<CarryRepositoryResult<readonly Carry[]>>;

  /**
   * Delete a Carry and its reflection; return its stored snapshot or null when missing.
   * Supplying a clock restricts deletion to a currently upcoming Carry.
   */
  delete(id: string, now?: () => Date): Promise<CarryRepositoryResult<Carry | null>>;

  /**
   * Find the newest reflection by creation time, breaking ties by reflection ID.
   */
  latestReflection(categoryId: string): Promise<CarryRepositoryResult<Reflection | null>>;
}
