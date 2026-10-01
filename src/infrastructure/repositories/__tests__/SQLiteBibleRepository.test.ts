import { SQLiteBibleRepository } from '../SQLiteBibleRepository';

const books = [
  { id: 'MAL', name: 'Malachi', bookOrder: 39, chapterCount: 4 },
  { id: 'MAT', name: 'Matthew', bookOrder: 40, chapterCount: 28 },
  { id: 'JAS', name: 'James', bookOrder: 59, chapterCount: 5 },
];

const verses = [
  {
    key: 'MAL.4.6',
    bookId: 'MAL',
    chapter: 4,
    verse: 6,
    text: 'And he will turn the hearts of the fathers to the children.',
    verseOrder: 1000,
  },
  {
    key: 'MAT.1.1',
    bookId: 'MAT',
    chapter: 1,
    verse: 1,
    text: '',
    verseOrder: 1001,
  },
  {
    key: 'JAS.1.19',
    bookId: 'JAS',
    chapter: 1,
    verse: 19,
    text: 'So then, my beloved brothers, let every man be swift to hear,',
    verseOrder: 5000,
  },
  {
    key: 'JAS.1.20',
    bookId: 'JAS',
    chapter: 1,
    verse: 20,
    text: 'for the anger of man doesn’t produce the righteousness of God.',
    verseOrder: 5001,
  },
  {
    key: 'JAS.2.1',
    bookId: 'JAS',
    chapter: 2,
    verse: 1,
    text: 'My brothers, don’t hold the faith of our Lord Jesus Christ',
    verseOrder: 5002,
  },
];

function makeDatabase(
  bookRows: unknown[] = books,
  verseRows: unknown[] = verses,
  shouldFail = false,
) {
  const getAllAsync = jest.fn(async (sql: string, ...parameters: unknown[]): Promise<unknown[]> => {
    if (shouldFail) {
      throw new Error('SQLite is unavailable.');
    }

    if (sql.includes('FROM books')) {
      return bookRows;
    }

    if (sql.includes('verse_order >= ?')) {
      const [startOrder, endOrder] = parameters as [number, number];
      return verseRows
        .filter((row): row is (typeof verses)[number] => {
          return (
            typeof row === 'object' &&
            row !== null &&
            'verseOrder' in row &&
            typeof row.verseOrder === 'number' &&
            row.verseOrder >= startOrder &&
            row.verseOrder <= endOrder
          );
        })
        .sort((left, right) => left.verseOrder - right.verseOrder);
    }

    if (sql.includes('chapter = ?')) {
      const [bookId, chapter] = parameters as [string, number];
      return verseRows.filter((row) => {
        return (
          typeof row === 'object' &&
          row !== null &&
          'bookId' in row &&
          'chapter' in row &&
          row.bookId === bookId &&
          row.chapter === chapter
        );
      });
    }

    return [];
  });

  const getFirstAsync = jest.fn(
    async (sql: string, ...parameters: unknown[]): Promise<unknown | null> => {
      if (shouldFail) {
        throw new Error('SQLite is unavailable.');
      }

      if (sql.includes('FROM books') && sql.includes('WHERE id = ?')) {
        const [bookId] = parameters as [string];
        const book = bookRows.find(
          (row) => typeof row === 'object' && row !== null && 'id' in row && row.id === bookId,
        );
        if (!book || typeof book !== 'object' || !('id' in book) || !('chapterCount' in book)) {
          return null;
        }
        return { id: book.id, chapterCount: book.chapterCount };
      }

      if (sql.includes('FROM verses') && sql.includes('WHERE v.key = ?')) {
        const [key] = parameters as [string];
        const verse = verseRows.find(
          (row) => typeof row === 'object' && row !== null && 'key' in row && row.key === key,
        );
        if (!verse || typeof verse !== 'object' || !('bookId' in verse)) {
          return null;
        }
        const book = bookRows.find(
          (row) =>
            typeof row === 'object' && row !== null && 'id' in row && row.id === verse.bookId,
        );
        if (!book || typeof book !== 'object' || !('name' in book)) {
          return null;
        }
        return { ...verse, bookName: book.name };
      }

      return null;
    },
  );

  return {
    database: { getAllAsync, getFirstAsync } as unknown as ConstructorParameters<
      typeof SQLiteBibleRepository
    >[0],
    getAllAsync,
    getFirstAsync,
  };
}

describe('SQLiteBibleRepository', () => {
  it('lists books in canonical order', async () => {
    const { database, getAllAsync } = makeDatabase();
    const repository = new SQLiteBibleRepository(database);

    const result = await repository.getBooks();

    expect(result).toEqual({
      ok: true,
      value: [
        { id: 'MAL', name: 'Malachi', order: 39, chapterCount: 4 },
        { id: 'MAT', name: 'Matthew', order: 40, chapterCount: 28 },
        { id: 'JAS', name: 'James', order: 59, chapterCount: 5 },
      ],
    });
    expect(getAllAsync.mock.calls[0][0]).toContain('ORDER BY book_order');
  });

  it('returns unavailable when the book dataset is empty', async () => {
    const repository = new SQLiteBibleRepository(makeDatabase([]).database);

    await expect(repository.getBooks()).resolves.toEqual({ ok: false, code: 'unavailable' });
  });

  it('returns unavailable when a book row is malformed', async () => {
    const repository = new SQLiteBibleRepository(
      makeDatabase([{ id: 'JAS', name: 'James', bookOrder: 0, chapterCount: 5 }]).database,
    );

    await expect(repository.getBooks()).resolves.toEqual({ ok: false, code: 'unavailable' });
  });

  it('returns a chapter in canonical verse order', async () => {
    const repository = new SQLiteBibleRepository(makeDatabase().database);

    const result = await repository.getChapter('JAS', 1);

    expect(result).toEqual({
      ok: true,
      value: [verses[2], verses[3]].map(({ verseOrder: _verseOrder, ...verse }) => verse),
    });
  });

  it('returns invalid_selection for an unknown book or chapter', async () => {
    const repository = new SQLiteBibleRepository(makeDatabase().database);

    await expect(repository.getChapter('UNKNOWN', 1)).resolves.toEqual({
      ok: false,
      code: 'invalid_selection',
    });
    await expect(repository.getChapter('JAS', 6)).resolves.toEqual({
      ok: false,
      code: 'invalid_selection',
    });
  });

  it('returns invalid_selection for a non-positive or non-integer chapter', async () => {
    const repository = new SQLiteBibleRepository(makeDatabase().database);

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
    const repository = new SQLiteBibleRepository(
      makeDatabase(books, [{ key: 'JAS.1.x', bookId: 'JAS', chapter: 1, verse: 0, text: null }])
        .database,
    );

    await expect(repository.getChapter('JAS', 1)).resolves.toEqual({
      ok: false,
      code: 'unavailable',
    });
  });

  it('resolves a single verse and preserves an empty source text', async () => {
    const repository = new SQLiteBibleRepository(makeDatabase().database);

    const result = await repository.getPassage({
      startVerseKey: 'MAT.1.1',
      endVerseKey: 'MAT.1.1',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        reference: 'Matthew 1:1',
        verses: [{ key: 'MAT.1.1', bookId: 'MAT', chapter: 1, verse: 1, text: '' }],
      },
    });
  });

  it('formats a same-chapter range and selects verses by canonical order', async () => {
    const repository = new SQLiteBibleRepository(makeDatabase().database);

    const result = await repository.getPassage({
      startVerseKey: 'JAS.1.19',
      endVerseKey: 'JAS.1.20',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        reference: 'James 1:19–20',
        verses: [
          { key: 'JAS.1.19', bookId: 'JAS', chapter: 1, verse: 19, text: verses[2].text },
          { key: 'JAS.1.20', bookId: 'JAS', chapter: 1, verse: 20, text: verses[3].text },
        ],
      },
    });
  });

  it('returns unavailable when a passage range has a verse_order gap', async () => {
    const gappedVerses = [verses[2], { ...verses[3], verseOrder: 5002 }];
    const repository = new SQLiteBibleRepository(makeDatabase(books, gappedVerses).database);

    await expect(
      repository.getPassage({
        startVerseKey: 'JAS.1.19',
        endVerseKey: 'JAS.1.20',
      }),
    ).resolves.toEqual({ ok: false, code: 'unavailable' });
  });

  it('formats a passage across chapters', async () => {
    const repository = new SQLiteBibleRepository(makeDatabase().database);

    const result = await repository.getPassage({
      startVerseKey: 'JAS.1.20',
      endVerseKey: 'JAS.2.1',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        reference: 'James 1:20–2:1',
        verses: [
          { key: 'JAS.1.20', bookId: 'JAS', chapter: 1, verse: 20, text: verses[3].text },
          { key: 'JAS.2.1', bookId: 'JAS', chapter: 2, verse: 1, text: verses[4].text },
        ],
      },
    });
  });

  it('formats a passage across books', async () => {
    const repository = new SQLiteBibleRepository(makeDatabase().database);

    const result = await repository.getPassage({
      startVerseKey: 'MAL.4.6',
      endVerseKey: 'MAT.1.1',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        reference: 'Malachi 4:6–Matthew 1:1',
        verses: [
          {
            key: 'MAL.4.6',
            bookId: 'MAL',
            chapter: 4,
            verse: 6,
            text: verses[0].text,
          },
          { key: 'MAT.1.1', bookId: 'MAT', chapter: 1, verse: 1, text: '' },
        ],
      },
    });
  });

  it('returns invalid_selection for malformed or unknown passage endpoints', async () => {
    const repository = new SQLiteBibleRepository(makeDatabase().database);

    await expect(
      repository.getPassage({ startVerseKey: 'JAS.1.x', endVerseKey: 'JAS.1.20' }),
    ).resolves.toEqual({ ok: false, code: 'invalid_selection' });
    await expect(
      repository.getPassage({ startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.21' }),
    ).resolves.toEqual({ ok: false, code: 'invalid_selection' });
  });

  it('rejects a passage whose start follows its end in canonical order', async () => {
    const repository = new SQLiteBibleRepository(makeDatabase().database);

    await expect(
      repository.getPassage({ startVerseKey: 'JAS.2.1', endVerseKey: 'JAS.1.19' }),
    ).resolves.toEqual({ ok: false, code: 'invalid_selection' });
  });

  it('returns unavailable when SQLite fails', async () => {
    const repository = new SQLiteBibleRepository(makeDatabase(books, verses, true).database);

    await expect(repository.getBooks()).resolves.toEqual({ ok: false, code: 'unavailable' });
  });
});
