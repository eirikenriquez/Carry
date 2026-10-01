import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { openBundledBible } from '../openBundledBible';

jest.mock('expo-asset', () => ({ Asset: { fromModule: jest.fn() } }));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('../../../../assets/bible/web-2026-09-28.db', () => 1);
jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///documents' },
  Directory: class {
    uri = 'file:///documents/SQLite';
    create() {}
  },
  File: class {
    get exists() {
      return false;
    }
    async copy() {}
  },
}));

describe('openBundledBible', () => {
  const database = {
    execAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    closeAsync: jest.fn(),
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    database.execAsync.mockResolvedValue(undefined);
    database.getFirstAsync.mockResolvedValue({ value: 'engwebp-2026-09-28' });
    database.closeAsync.mockResolvedValue(undefined);
    jest.mocked(openDatabaseAsync).mockResolvedValue(database as unknown as SQLiteDatabase);
    const asset = { localUri: 'file:///bundled/bible.db' };
    jest.mocked(Asset.fromModule).mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue(asset),
    } as unknown as Asset);
  });

  it('copies the bundled asset and enables read-only queries', async () => {
    const copy = jest.spyOn(File.prototype, 'copy');

    expect((await openBundledBible()).ok).toBe(true);
    expect(copy).toHaveBeenCalledTimes(1);
    expect(database.execAsync).toHaveBeenCalledWith('PRAGMA query_only = ON');
  });

  it('reuses an existing local copy without loading an asset', async () => {
    jest.spyOn(File.prototype, 'exists', 'get').mockReturnValue(true);

    expect((await openBundledBible()).ok).toBe(true);
    expect(Asset.fromModule).not.toHaveBeenCalled();
  });

  it('returns unavailable if the asset has no local URI', async () => {
    jest.mocked(Asset.fromModule).mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue({ localUri: null }),
    } as unknown as Asset);

    expect(await openBundledBible()).toEqual({ ok: false, code: 'unavailable' });
    expect(openDatabaseAsync).not.toHaveBeenCalled();
  });

  it('does not open SQLite when copying fails', async () => {
    jest.spyOn(File.prototype, 'copy').mockRejectedValue(new Error('Storage full'));

    expect(await openBundledBible()).toEqual({ ok: false, code: 'unavailable' });
    expect(openDatabaseAsync).not.toHaveBeenCalled();
  });

  it('closes an incompatible database and returns unavailable', async () => {
    database.getFirstAsync.mockResolvedValue({ value: 'different-dataset' });

    expect(await openBundledBible()).toEqual({ ok: false, code: 'unavailable' });
    expect(database.closeAsync).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable when SQLite cannot be opened', async () => {
    jest.mocked(openDatabaseAsync).mockRejectedValueOnce(new Error('Unreadable database'));

    expect(await openBundledBible()).toEqual({ ok: false, code: 'unavailable' });
  });
});
