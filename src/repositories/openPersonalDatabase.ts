import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { CarryRepositoryResult } from './CarryRepository';
import { personalDatabaseSchema, personalDatabaseVersion } from './personalDatabaseSchema';

/**
 * Open a private connection and initialize only a genuinely empty personal database.
 */
export async function openPersonalDatabase(): Promise<CarryRepositoryResult<SQLiteDatabase>> {
  let database: SQLiteDatabase | undefined;
  let inTransaction = false;

  try {
    database = await openDatabaseAsync('carry.db', { useNewConnection: true });
    // Foreign keys are connection-specific and must be enabled before BEGIN.
    await database.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
    const foreignKeys = await database.getFirstAsync<{ foreign_keys: number }>(
      'PRAGMA foreign_keys',
    );
    if (foreignKeys?.foreign_keys !== 1) {
      throw new Error('Personal database requires foreign key enforcement.');
    }

    // Lock before inspecting the version so simultaneous opens cannot both initialize it.
    await database.execAsync('BEGIN IMMEDIATE');
    inTransaction = true;
    const version = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');

    if (version?.user_version === 0) {
      const existing = await database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' LIMIT 1",
      );
      if (existing) {
        throw new Error('Unversioned personal database is not empty.');
      }
      await database.execAsync(personalDatabaseSchema);
    } else if (version?.user_version !== personalDatabaseVersion) {
      throw new Error('Unsupported personal database version.');
    }

    // Check the columns used by the adapter; a version number alone is not enough.
    await database.getAllAsync('SELECT id, name, normalized_name FROM categories LIMIT 0');
    await database.getAllAsync(`SELECT id, category_id, situation, scheduled_at,
      start_verse_key, end_verse_key, if_then_intention, reminder_id, created_at
      FROM carries LIMIT 0`);
    await database.getAllAsync(`SELECT id, carry_id, alignment_rating, what_occurred,
      insight, created_at FROM reflections LIMIT 0`);

    await database.execAsync('COMMIT');
    inTransaction = false;
    return { ok: true, value: database };
  } catch {
    if (database) {
      if (inTransaction) {
        await database.execAsync('ROLLBACK').catch(() => undefined);
      }
      await database.closeAsync().catch(() => undefined);
    }
    // Never delete or replace a personal database when opening fails.
    return { ok: false, code: 'unavailable' };
  }
}
