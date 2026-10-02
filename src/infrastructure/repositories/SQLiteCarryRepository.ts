import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CarryRepository,
  CarryRepositoryResult,
} from '../../application/ports/CarryRepository';
import type { Carry } from '../../domain/entities/Carry';
import type { Category } from '../../domain/entities/Category';
import type { AlignmentRating, Reflection } from '../../domain/entities/Reflection';
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
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid stored personal date.');
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

export class SQLiteCarryRepository implements Pick<
  CarryRepository,
  'getCategories' | 'getOrCreateCategory' | 'findById' | 'findAll' | 'latestReflection'
> {
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
