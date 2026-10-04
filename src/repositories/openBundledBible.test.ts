import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { openBundledBible } from './openBundledBible';

// Track file operations in memory so loader recovery does not need device storage.
const mockFiles = new Set<string>();
const destinationUri = 'file:///documents/SQLite/web-2026-09-28.db';
const temporaryUri = `${destinationUri}.tmp`;

jest.mock('expo-asset', () => ({ Asset: { fromModule: jest.fn() } }));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('../../assets/bible/web-2026-09-28.db', () => 1);
jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///documents' },
  Directory: class {
    uri = 'file:///documents/SQLite';
    create() {}
  },
  File: class {
    uri: string;
    constructor(parent: string | { uri: string }, name?: string) {
      const parentUri = typeof parent === 'string' ? parent : parent.uri;
      this.uri = name ? `${parentUri}/${name}` : parentUri;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    async copy(destination: { uri: string }) {
      mockFiles.add(destination.uri);
    }
    async move(destination: { uri: string }) {
      mockFiles.delete(this.uri);
      mockFiles.add(destination.uri);
      this.uri = destination.uri;
    }
    delete() {
      mockFiles.delete(this.uri);
    }
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
    mockFiles.clear();
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
    const move = jest.spyOn(File.prototype, 'move');

    expect((await openBundledBible()).ok).toBe(true);
    expect(copy).toHaveBeenCalledTimes(1);
    expect(jest.mocked(openDatabaseAsync).mock.calls[0][0]).toBe('web-2026-09-28.db.tmp');
    expect(move.mock.invocationCallOrder[0]).toBeGreaterThan(
      database.closeAsync.mock.invocationCallOrder[0],
    );
    expect(mockFiles.has(destinationUri)).toBe(true);
    expect(mockFiles.has(temporaryUri)).toBe(false);
    expect(database.execAsync).toHaveBeenCalledWith('PRAGMA query_only = ON');
  });

  it('reuses an existing local copy without loading an asset', async () => {
    mockFiles.add(destinationUri);

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

  it('cleans up a failed copy so the next attempt can succeed', async () => {
    jest.spyOn(File.prototype, 'copy').mockImplementationOnce(async (destination) => {
      mockFiles.add(destination.uri);
      throw new Error('Storage full');
    });

    expect(await openBundledBible()).toEqual({ ok: false, code: 'unavailable' });
    expect(openDatabaseAsync).not.toHaveBeenCalled();
    expect(mockFiles.has(destinationUri)).toBe(false);
    expect(mockFiles.has(temporaryUri)).toBe(false);

    // Also exercise an unfinished temporary file left by a terminated process.
    mockFiles.add(temporaryUri);
    expect((await openBundledBible()).ok).toBe(true);
    expect(mockFiles.has(destinationUri)).toBe(true);
    expect(mockFiles.has(temporaryUri)).toBe(false);
  });

  it('closes an incompatible database and returns unavailable', async () => {
    database.getFirstAsync.mockResolvedValue({ value: 'different-dataset' });

    expect(await openBundledBible()).toEqual({ ok: false, code: 'unavailable' });
    expect(database.closeAsync).toHaveBeenCalledTimes(1);
    expect(mockFiles.has(destinationUri)).toBe(false);
    expect(mockFiles.has(temporaryUri)).toBe(false);
  });

  it('returns unavailable when SQLite cannot be opened', async () => {
    jest.mocked(openDatabaseAsync).mockRejectedValueOnce(new Error('Unreadable database'));

    expect(await openBundledBible()).toEqual({ ok: false, code: 'unavailable' });
  });
});
