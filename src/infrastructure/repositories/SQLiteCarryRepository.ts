import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CarryRepository,
  CarryRepositoryResult,
} from '../../application/ports/CarryRepository';
import type { Carry } from '../../domain/entities/Carry';
import type { Category } from '../../domain/entities/Category';
import type { AlignmentRating, Reflection } from '../../domain/entities/Reflection';
import { getCarryStatus } from '../../domain/rules/getCarryStatus';
import { normalizeCategoryName } from '../../domain/rules/normalizeCategoryName';
import { openPersonalDatabase } from './openPersonalDatabase';

interface ReflectionRow {
  readonly reflectionId: string | null;
  readonly alignmentRating: AlignmentRating | null;
  readonly whatOccurred: string | null;
  readonly insight: string | null;
  readonly reflectedAt: string | null;
}

interface CarryRow extends ReflectionRow {
  readonly id: string;
  readonly categoryId: string;
  readonly situation: string;
  readonly scheduledAt: string;
  readonly startVerseKey: string;
  readonly endVerseKey: string;
  readonly ifThenIntention: string;
  readonly reminderId: string | null;
  readonly createdAt: string;
}

const reflectionColumns = `r.id AS reflectionId, r.alignment_rating AS alignmentRating,
  r.what_occurred AS whatOccurred, r.insight, r.created_at AS reflectedAt`;
const carryQuery = `SELECT c.id, c.category_id AS categoryId, c.situation,
  c.scheduled_at AS scheduledAt, c.start_verse_key AS startVerseKey,
  c.end_verse_key AS endVerseKey, c.if_then_intention AS ifThenIntention,
  c.reminder_id AS reminderId, c.created_at AS createdAt, ${reflectionColumns}
  FROM carries c LEFT JOIN reflections r ON r.carry_id = c.id`;

/**
 * Reject unusable stored dates instead of returning an invalid domain value.
 */
function readDate(value: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    throw new Error('Invalid stored personal date.');
  }
  return date;
}

/**
 * Map the optional joined reflection back to the Carry's owned domain value.
 */
function readReflection(row: ReflectionRow): Reflection | undefined {
  if (row.reflectionId === null) return undefined;
  if (
    !row.reflectionId ||
    !Number.isInteger(row.alignmentRating) ||
    row.alignmentRating === null ||
    row.alignmentRating < 1 ||
    row.alignmentRating > 5 ||
    !row.whatOccurred?.trim() ||
    !row.insight?.trim() ||
    !row.reflectedAt
  ) {
    throw new Error('Invalid stored reflection.');
  }
  return {
    id: row.reflectionId,
    alignmentRating: row.alignmentRating,
    whatOccurred: row.whatOccurred,
    insight: row.insight,
    createdAt: readDate(row.reflectedAt),
  };
}

/**
 * Restore dates and passage keys without adding stored status or Scripture text.
 */
function readCarry(row: CarryRow): Carry {
  return {
    id: row.id,
    categoryId: row.categoryId,
    situation: row.situation,
    scheduledAt: readDate(row.scheduledAt),
    passage: { startVerseKey: row.startVerseKey, endVerseKey: row.endVerseKey },
    ifThenIntention: row.ifThenIntention,
    reminderId: row.reminderId ?? undefined,
    reflection: readReflection(row),
    createdAt: readDate(row.createdAt),
  };
}

/**
 * Validate stored fields without duplicating the creation service's lifecycle rules.
 */
function isValidCarryRecord(carry: Carry): boolean {
  const text = [
    carry.id,
    carry.categoryId,
    carry.situation,
    carry.ifThenIntention,
    carry.passage.startVerseKey,
    carry.passage.endVerseKey,
  ];
  const dates = [carry.scheduledAt, carry.createdAt];
  const reflection = carry.reflection;
  if (reflection) {
    text.push(reflection.id, reflection.whatOccurred, reflection.insight);
    dates.push(reflection.createdAt);
    if (
      !Number.isInteger(reflection.alignmentRating) ||
      reflection.alignmentRating < 1 ||
      reflection.alignmentRating > 5
    ) {
      return false;
    }
  }

  return (
    text.every((value) => Boolean(value.trim())) &&
    dates.every((value) => Number.isFinite(value.getTime()))
  );
}

export class SQLiteCarryRepository implements CarryRepository {
  /**
   * Give each operation its own initialized connection and always close it afterward.
   */
  private async withDatabase<T>(
    operation: (database: SQLiteDatabase) => Promise<CarryRepositoryResult<T>>,
  ): Promise<CarryRepositoryResult<T>> {
    const opened = await openPersonalDatabase();
    if (!opened.ok) return opened;
    try {
      return await operation(opened.value);
    } catch {
      return { ok: false, code: 'unavailable' };
    } finally {
      await opened.value.closeAsync().catch(() => undefined);
    }
  }

  async getCategories(): Promise<CarryRepositoryResult<readonly Category[]>> {
    return this.withDatabase(async (database) => {
      const rows = await database.getAllAsync<Category>(
        'SELECT id, name FROM categories ORDER BY normalized_name, id',
      );
      return { ok: true, value: rows.map((row) => ({ id: row.id, name: row.name })) };
    });
  }

  /**
   * Commit the whole write or roll it back on validation or SQLite failure.
   */
  private async withTransaction<T>(
    database: SQLiteDatabase,
    operation: () => Promise<CarryRepositoryResult<T>>,
  ): Promise<CarryRepositoryResult<T>> {
    await database.execAsync('BEGIN IMMEDIATE');
    try {
      const result = await operation();
      await database.execAsync(result.ok ? 'COMMIT' : 'ROLLBACK');
      return result;
    } catch (error) {
      await database.execAsync('ROLLBACK').catch(() => undefined);
      throw error;
    }
  }

  /**
   * Reuse a case/whitespace-insensitive name while retaining its original display spelling.
   */
  async getOrCreateCategory(category: Category): Promise<CarryRepositoryResult<Category>> {
    const name = category.name.trim().replace(/\s+/g, ' ');
    const normalized = normalizeCategoryName(name);
    if (!category.id.trim() || !normalized) return { ok: false, code: 'invalid_record' };
    return this.withDatabase(async (database) => {
      await database.runAsync(
        `INSERT INTO categories (id, name, normalized_name)
        VALUES (?, ?, ?) ON CONFLICT(normalized_name) DO NOTHING`,
        category.id,
        name,
        normalized,
      );
      const stored = await database.getFirstAsync<Category>(
        'SELECT id, name FROM categories WHERE normalized_name = ?',
        normalized,
      );
      if (!stored) return { ok: false, code: 'unavailable' };
      return { ok: true, value: { id: stored.id, name: stored.name } };
    });
  }

  /**
   * Keep category creation in the same transaction as the Carry insert.
   */
  async create(category: Category, carry: Carry): Promise<CarryRepositoryResult<Carry>> {
    const name = category.name.trim().replace(/\s+/g, ' ');
    const normalized = normalizeCategoryName(name);
    if (
      !category.id.trim() ||
      !normalized ||
      !isValidCarryRecord(carry) ||
      carry.categoryId !== category.id ||
      carry.reflection !== undefined ||
      carry.reminderId !== undefined
    ) {
      return { ok: false, code: 'invalid_record' };
    }

    return this.withDatabase((database) =>
      this.withTransaction(database, async () => {
        const duplicate = await database.getFirstAsync<{ id: string }>(
          'SELECT id FROM carries WHERE id = ?',
          carry.id,
        );
        if (duplicate) return { ok: false, code: 'invalid_record' };

        const idOwner = await database.getFirstAsync<{ normalizedName: string }>(
          'SELECT normalized_name AS normalizedName FROM categories WHERE id = ?',
          category.id,
        );
        if (idOwner && idOwner.normalizedName !== normalized) {
          return { ok: false, code: 'invalid_record' };
        }

        await database.runAsync(
          `INSERT INTO categories (id, name, normalized_name)
          VALUES (?, ?, ?) ON CONFLICT(normalized_name) DO NOTHING`,
          category.id,
          name,
          normalized,
        );
        const storedCategory = await database.getFirstAsync<Category>(
          'SELECT id, name FROM categories WHERE normalized_name = ?',
          normalized,
        );
        if (!storedCategory) return { ok: false, code: 'unavailable' };

        const storedCarry = { ...carry, categoryId: storedCategory.id };
        await database.runAsync(
          `INSERT INTO carries (id, category_id, situation, scheduled_at,
          start_verse_key, end_verse_key, if_then_intention, reminder_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          storedCarry.id,
          storedCarry.categoryId,
          storedCarry.situation,
          storedCarry.scheduledAt.toISOString(),
          storedCarry.passage.startVerseKey,
          storedCarry.passage.endVerseKey,
          storedCarry.ifThenIntention,
          storedCarry.reminderId ?? null,
          storedCarry.createdAt.toISOString(),
        );
        const row = await database.getFirstAsync<CarryRow>(
          `${carryQuery} WHERE c.id = ?`,
          storedCarry.id,
        );
        if (!row) return { ok: false, code: 'unavailable' };
        return { ok: true, value: readCarry(row) };
      }),
    );
  }

  /**
   * Update only editable fields, retaining stored identity and lifecycle-owned metadata.
   */
  async update(
    category: Category,
    carry: Carry,
    now?: () => Date,
  ): Promise<CarryRepositoryResult<Carry | null>> {
    if (
      !category ||
      typeof category.id !== 'string' ||
      !category.id.trim() ||
      typeof category.name !== 'string' ||
      !carry ||
      !isValidCarryRecord(carry) ||
      carry.categoryId !== category.id
    ) {
      return { ok: false, code: 'invalid_record' };
    }

    const name = category.name.trim().replace(/\s+/g, ' ');
    const normalized = normalizeCategoryName(name);
    if (!normalized) return { ok: false, code: 'invalid_record' };

    return this.withDatabase((database) =>
      this.withTransaction(database, async () => {
        const existing = await database.getFirstAsync<CarryRow>(
          `${carryQuery} WHERE c.id = ?`,
          carry.id,
        );
        if (!existing) return { ok: true, value: null };

        if (now) {
          const checkedAt = now();
          if (getCarryStatus(readCarry(existing), checkedAt) !== 'upcoming') {
            return { ok: false, code: 'not_upcoming' };
          }
          if (carry.scheduledAt.getTime() <= checkedAt.getTime()) {
            return { ok: false, code: 'invalid_record' };
          }
        }

        const idOwner = await database.getFirstAsync<{ normalizedName: string }>(
          'SELECT normalized_name AS normalizedName FROM categories WHERE id = ?',
          category.id,
        );
        if (idOwner && idOwner.normalizedName !== normalized) {
          return { ok: false, code: 'invalid_record' };
        }

        await database.runAsync(
          `INSERT INTO categories (id, name, normalized_name)
          VALUES (?, ?, ?) ON CONFLICT(normalized_name) DO NOTHING`,
          category.id,
          name,
          normalized,
        );
        const storedCategory = await database.getFirstAsync<Category>(
          'SELECT id, name FROM categories WHERE normalized_name = ?',
          normalized,
        );
        if (!storedCategory) return { ok: false, code: 'unavailable' };

        const result = await database.runAsync(
          `UPDATE carries SET category_id = ?, situation = ?, scheduled_at = ?,
          start_verse_key = ?, end_verse_key = ?, if_then_intention = ? WHERE id = ?`,
          storedCategory.id,
          carry.situation,
          carry.scheduledAt.toISOString(),
          carry.passage.startVerseKey,
          carry.passage.endVerseKey,
          carry.ifThenIntention,
          carry.id,
        );
        if (result.changes === 0) return { ok: false, code: 'unavailable' };

        const row = await database.getFirstAsync<CarryRow>(
          `${carryQuery} WHERE c.id = ?`,
          carry.id,
        );
        if (!row) return { ok: false, code: 'unavailable' };
        return { ok: true, value: readCarry(row) };
      }),
    );
  }

  async findById(id: string): Promise<CarryRepositoryResult<Carry | null>> {
    return this.withDatabase(async (database) => {
      const row = await database.getFirstAsync<CarryRow>(`${carryQuery} WHERE c.id = ?`, id);
      return { ok: true, value: row ? readCarry(row) : null };
    });
  }

  async findAll(): Promise<CarryRepositoryResult<readonly Carry[]>> {
    return this.withDatabase(async (database) => {
      const rows = await database.getAllAsync<CarryRow>(
        `${carryQuery} ORDER BY c.scheduled_at, c.id`,
      );
      return { ok: true, value: rows.map(readCarry) };
    });
  }

  /**
   * Save a Carry and any supplied reflection atomically, preserving an omitted reflection.
   */
  async save(carry: Carry): Promise<CarryRepositoryResult<Carry>> {
    if (!isValidCarryRecord(carry)) return { ok: false, code: 'invalid_record' };
    const reflection = carry.reflection;

    return this.withDatabase((database) =>
      this.withTransaction(database, async () => {
        const category = await database.getFirstAsync<{ id: string }>(
          'SELECT id FROM categories WHERE id = ?',
          carry.categoryId,
        );
        if (!category) return { ok: false, code: 'invalid_record' };
        if (reflection) {
          const owner = await database.getFirstAsync<{ carryId: string }>(
            'SELECT carry_id AS carryId FROM reflections WHERE id = ?',
            reflection.id,
          );
          if (owner && owner.carryId !== carry.id) return { ok: false, code: 'invalid_record' };
        }

        await database.runAsync(
          `INSERT INTO carries (id, category_id, situation,
        scheduled_at, start_verse_key, end_verse_key, if_then_intention, reminder_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id,
        situation = excluded.situation, scheduled_at = excluded.scheduled_at,
        start_verse_key = excluded.start_verse_key, end_verse_key = excluded.end_verse_key,
        if_then_intention = excluded.if_then_intention, reminder_id = excluded.reminder_id,
        created_at = excluded.created_at`,
          carry.id,
          carry.categoryId,
          carry.situation,
          carry.scheduledAt.toISOString(),
          carry.passage.startVerseKey,
          carry.passage.endVerseKey,
          carry.ifThenIntention,
          carry.reminderId ?? null,
          carry.createdAt.toISOString(),
        );
        if (reflection) {
          await database.runAsync(
            `INSERT INTO reflections (id, carry_id, alignment_rating,
          what_occurred, insight, created_at) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(carry_id) DO UPDATE SET id = excluded.id,
          alignment_rating = excluded.alignment_rating, what_occurred = excluded.what_occurred,
          insight = excluded.insight, created_at = excluded.created_at`,
            reflection.id,
            carry.id,
            reflection.alignmentRating,
            reflection.whatOccurred,
            reflection.insight,
            reflection.createdAt.toISOString(),
          );
        }
        const row = await database.getFirstAsync<CarryRow>(
          `${carryQuery} WHERE c.id = ?`,
          carry.id,
        );
        if (!row) return { ok: false, code: 'unavailable' };
        return { ok: true, value: readCarry(row) };
      }),
    );
  }

  /** Update only the notification link; false means the saved Carry no longer exists. */
  async setReminderId(id: string, reminderId: string): Promise<CarryRepositoryResult<boolean>> {
    if (
      typeof id !== 'string' ||
      !id.trim() ||
      typeof reminderId !== 'string' ||
      !reminderId.trim()
    ) {
      return { ok: false, code: 'invalid_record' };
    }

    return this.withDatabase(async (database) => {
      const result = await database.runAsync(
        'UPDATE carries SET reminder_id = ? WHERE id = ?',
        reminderId,
        id,
      );
      return { ok: true, value: result.changes > 0 };
    });
  }

  /**
   * Delete the Carry and its owned reflection; categories remain reusable.
   */
  async delete(id: string, now?: () => Date): Promise<CarryRepositoryResult<void>> {
    return this.withDatabase((database) =>
      this.withTransaction(database, async () => {
        if (now) {
          const existing = await database.getFirstAsync<CarryRow>(
            `${carryQuery} WHERE c.id = ?`,
            id,
          );
          if (!existing) return { ok: true, value: undefined };
          if (getCarryStatus(readCarry(existing), now()) !== 'upcoming') {
            return { ok: false, code: 'not_upcoming' };
          }
        }

        await database.runAsync('DELETE FROM carries WHERE id = ?', id);
        return { ok: true, value: undefined };
      }),
    );
  }

  /**
   * Retrieve the latest category reflection by its creation time, not the Carry schedule.
   */
  async latestReflection(categoryId: string): Promise<CarryRepositoryResult<Reflection | null>> {
    return this.withDatabase(async (database) => {
      const row = await database.getFirstAsync<ReflectionRow>(
        `SELECT ${reflectionColumns} FROM reflections r
         JOIN carries c ON c.id = r.carry_id WHERE c.category_id = ?
         ORDER BY r.created_at DESC, r.id DESC LIMIT 1`,
        categoryId,
      );
      return { ok: true, value: row ? (readReflection(row) ?? null) : null };
    });
  }
}
