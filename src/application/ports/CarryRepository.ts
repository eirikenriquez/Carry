import type { Carry } from '../../domain/entities/Carry';
import type { Category } from '../../domain/entities/Category';
import type { Reflection } from '../../domain/entities/Reflection';

export type CarryRepositoryErrorCode = 'invalid_record' | 'not_upcoming' | 'unavailable';

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
