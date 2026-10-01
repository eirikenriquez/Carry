import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type {
  BibleRepository,
  BibleRepositoryResult,
} from '../../application/ports/BibleRepository';
import { SQLiteBibleRepository } from './SQLiteBibleRepository';

const databaseName = 'web-2026-09-28.db';

export async function openBundledBible(): Promise<BibleRepositoryResult<BibleRepository>> {
  let database: SQLiteDatabase | undefined;

  try {
    const directory = new Directory(Paths.document, 'SQLite');
    directory.create({ idempotent: true, intermediates: true });
    const destination = new File(directory, databaseName);

    if (!destination.exists) {
      const asset = await Asset.fromModule(
        require('../../../assets/bible/web-2026-09-28.db'),
      ).downloadAsync();
      if (!asset.localUri) {
        return { ok: false, code: 'unavailable' };
      }
      await new File(asset.localUri).copy(destination);
    }

    database = await openDatabaseAsync(databaseName, {}, directory.uri);
    await database.execAsync('PRAGMA query_only = ON');
    const metadata = await database.getFirstAsync<{ value: string }>(
      'SELECT value FROM metadata WHERE name = ?',
      'dataset',
    );
    if (metadata?.value !== 'engwebp-2026-09-28') {
      throw new Error('Unexpected bundled Bible version.');
    }

    return { ok: true, value: new SQLiteBibleRepository(database) };
  } catch {
    if (database) {
      await database.closeAsync().catch(() => undefined);
    }
    return { ok: false, code: 'unavailable' };
  }
}
