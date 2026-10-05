import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { openBundledBible } from './openBundledBible';

// Track bundled copy operations without writing device storage.
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
});
