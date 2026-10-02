// Temporarily call from App's startup effect for native acceptance, then remove the hook.
import type { CarryRepositoryResult } from '../src/application/ports/CarryRepository';
import type { Carry } from '../src/domain/entities/Carry';
import { openPersonalDatabase } from '../src/infrastructure/repositories/openPersonalDatabase';
import { SQLiteCarryRepository } from '../src/infrastructure/repositories/SQLiteCarryRepository';

const category = { id: 'native-check-category', name: 'Native storage check' };
const upcoming: Carry = {
  id: 'native-check-upcoming',
  categoryId: category.id,
  situation: 'Native persistence test only',
  scheduledAt: new Date('2026-10-03T21:00:00.000Z'),
  passage: { startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.20' },
  ifThenIntention: 'If this test runs, then verify every stored field.',
  reminderId: 'native-check-reminder',
  reflection: undefined,
  createdAt: new Date('2026-10-02T01:00:00.000Z'),
};
const reflected: Carry = {
  ...upcoming,
  id: 'native-check-reflected',
  reminderId: undefined,
  reflection: {
    id: 'native-check-reflection',
    alignmentRating: 4,
    whatOccurred: 'This record was saved for a native check.',
    insight: 'Restart without clearing app data.',
    createdAt: new Date('2026-10-04T01:00:00.000Z'),
  },
};

/**
 * Stop acceptance immediately rather than overlooking a controlled storage failure.
 */
function requireValue<T>(result: CarryRepositoryResult<T>): T {
  if (!result.ok) throw new Error(`Storage returned ${result.code}`);
  return result.value;
}

/**
 * Compare every stored field and confirm that dates were restored as Date values.
 */
function verifyRecord(actual: Carry | null, expected: Carry): void {
  if (
    !actual ||
    !(actual.scheduledAt instanceof Date) ||
    !(actual.createdAt instanceof Date) ||
    (actual.reflection && !(actual.reflection.createdAt instanceof Date)) ||
    JSON.stringify(actual) !== JSON.stringify(expected)
  ) {
    throw new Error(`Native record mismatch: ${expected.id}`);
  }
}

/**
 * Seed isolated records, verify them after restart, or clean up only those exact records.
 */
export async function verifyCarryStorage(cleanup = false): Promise<void> {
  const repository = new SQLiteCarryRepository();
  const savedUpcoming = requireValue(await repository.findById(upcoming.id));
  const savedReflected = requireValue(await repository.findById(reflected.id));

  if (!savedUpcoming && !savedReflected && !cleanup) {
    const savedCategory = requireValue(await repository.getOrCreateCategory(category));
    if (savedCategory.id !== category.id || savedCategory.name !== category.name) {
      throw new Error('Native check category collides with existing data.');
    }
    verifyRecord(requireValue(await repository.save(upcoming)), upcoming);
    verifyRecord(requireValue(await repository.save(reflected)), reflected);
    console.info('CARRY_STORAGE_CHECK SAVED two complete records');
    return;
  }

  // A different existing record must never be overwritten or deleted by this check.
  verifyRecord(savedUpcoming, upcoming);
  verifyRecord(savedReflected, reflected);
  const reused = requireValue(
    await repository.getOrCreateCategory({
      id: 'native-check-unused-category',
      name: '  NATIVE   storage check ',
    }),
  );
  if (reused.id !== category.id) throw new Error('Native category reuse failed.');
  const latest = requireValue(await repository.latestReflection(category.id));
  if (JSON.stringify(latest) !== JSON.stringify(reflected.reflection)) {
    throw new Error('Native latest reflection mismatch.');
  }

  if (cleanup) {
    requireValue(await repository.delete(upcoming.id));
    requireValue(await repository.delete(reflected.id));
    if (
      requireValue(await repository.latestReflection(category.id)) !== null ||
      requireValue(await repository.findById(upcoming.id)) !== null ||
      requireValue(await repository.findById(reflected.id)) !== null
    ) {
      throw new Error('Native deletion cleanup failed.');
    }
    const database = requireValue(await openPersonalDatabase());
    try {
      await database.runAsync(
        'DELETE FROM categories WHERE id = ? AND normalized_name = ?',
        category.id,
        'native storage check',
      );
    } finally {
      await database.closeAsync();
    }
    console.info('CARRY_STORAGE_CHECK CLEANED test records and owned reflection/category');
  } else {
    console.info('CARRY_STORAGE_CHECK PRESERVED all fields, dates, reminder ID and reflection');
  }
}
