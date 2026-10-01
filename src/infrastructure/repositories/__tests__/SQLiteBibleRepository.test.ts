import { SQLiteBibleRepository } from '../SQLiteBibleRepository';

const startVerse = {
  key: 'JAS.1.19',
  bookId: 'JAS',
  chapter: 1,
  verse: 19,
  text: 'Let every man be swift to hear.',
  verseOrder: 5000,
  bookName: 'James',
};
const endVerse = {
  ...startVerse,
  key: 'JAS.1.20',
  verse: 20,
  verseOrder: 5001,
};

function makeDatabase() {
  const getAllAsync = jest.fn().mockResolvedValue([]);
  const getFirstAsync = jest.fn().mockResolvedValue(null);
  const database = { getAllAsync, getFirstAsync } as unknown as ConstructorParameters<
    typeof SQLiteBibleRepository
  >[0];

  return { repository: new SQLiteBibleRepository(database), getAllAsync, getFirstAsync };
}

// Successful reads are checked against real SQLite; mocks cover failures here.
describe('SQLiteBibleRepository', () => {
  it('returns unavailable when the book dataset is empty', async () => {
    const { repository } = makeDatabase();

    await expect(repository.getBooks()).resolves.toEqual({ ok: false, code: 'unavailable' });
  });

  it('returns unavailable when a book row is malformed', async () => {
    const { repository, getAllAsync } = makeDatabase();
    getAllAsync.mockResolvedValue([{ id: 'JAS', name: 'James', bookOrder: 0, chapterCount: 5 }]);

    await expect(repository.getBooks()).resolves.toEqual({ ok: false, code: 'unavailable' });
  });

  it('returns invalid_selection for an unknown book or chapter', async () => {
    const { repository, getFirstAsync } = makeDatabase();

    await expect(repository.getChapter('UNKNOWN', 1)).resolves.toEqual({
      ok: false,
      code: 'invalid_selection',
    });
    getFirstAsync.mockResolvedValue({ id: 'JAS', chapterCount: 5 });
    await expect(repository.getChapter('JAS', 6)).resolves.toEqual({
      ok: false,
      code: 'invalid_selection',
    });
  });

  it('returns invalid_selection for a non-positive or non-integer chapter', async () => {
    const { repository } = makeDatabase();

    await expect(repository.getChapter('JAS', 0)).resolves.toEqual({
      ok: false,
      code: 'invalid_selection',
    });
    await expect(repository.getChapter('JAS', 1.5)).resolves.toEqual({
      ok: false,
      code: 'invalid_selection',
    });
  });

  it('returns unavailable when a chapter contains a malformed verse row', async () => {
    const { repository, getFirstAsync, getAllAsync } = makeDatabase();
    getFirstAsync.mockResolvedValue({ id: 'JAS', chapterCount: 5 });
    getAllAsync.mockResolvedValue([
      { key: 'JAS.1.x', bookId: 'JAS', chapter: 1, verse: 0, text: null },
    ]);

    await expect(repository.getChapter('JAS', 1)).resolves.toEqual({
      ok: false,
      code: 'unavailable',
    });
  });

  it('returns unavailable when a passage range has a verse_order gap', async () => {
    const { repository, getFirstAsync, getAllAsync } = makeDatabase();
    const gappedEnd = { ...endVerse, verseOrder: 5002 };
    getFirstAsync.mockResolvedValueOnce(startVerse).mockResolvedValueOnce(gappedEnd);
    getAllAsync.mockResolvedValue([startVerse, gappedEnd]);

    await expect(
      repository.getPassage({ startVerseKey: startVerse.key, endVerseKey: endVerse.key }),
    ).resolves.toEqual({ ok: false, code: 'unavailable' });
  });

  it('returns invalid_selection for malformed or unknown passage endpoints', async () => {
    const { repository, getFirstAsync } = makeDatabase();

    await expect(
      repository.getPassage({ startVerseKey: 'JAS.1.x', endVerseKey: endVerse.key }),
    ).resolves.toEqual({ ok: false, code: 'invalid_selection' });
    getFirstAsync.mockResolvedValueOnce(startVerse);
    await expect(
      repository.getPassage({ startVerseKey: startVerse.key, endVerseKey: 'JAS.1.99' }),
    ).resolves.toEqual({ ok: false, code: 'invalid_selection' });
  });

  it('rejects a passage whose start follows its end in canonical order', async () => {
    const { repository, getFirstAsync } = makeDatabase();
    getFirstAsync.mockResolvedValueOnce(endVerse).mockResolvedValueOnce(startVerse);

    await expect(
      repository.getPassage({ startVerseKey: endVerse.key, endVerseKey: startVerse.key }),
    ).resolves.toEqual({ ok: false, code: 'invalid_selection' });
  });

  it('returns unavailable when SQLite fails', async () => {
    const { repository, getAllAsync } = makeDatabase();
    getAllAsync.mockRejectedValue(new Error('SQLite is unavailable.'));

    await expect(repository.getBooks()).resolves.toEqual({ ok: false, code: 'unavailable' });
  });
});
