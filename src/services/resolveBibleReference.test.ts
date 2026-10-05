import type { BibleBook } from '../models/BibleBook';
import type { BiblePassage } from '../models/BiblePassage';
import type { PassageSelection } from '../models/PassageSelection';
import type { BibleRepository, BibleRepositoryResult } from '../repositories/BibleRepository';
import { resolveBibleReference } from './resolveBibleReference';

const BOOKS: readonly BibleBook[] = [
  { id: 'JHN', name: 'John', order: 43, chapterCount: 21 },
  { id: '1JN', name: '1 John', order: 62, chapterCount: 5 },
];

function verseForKey(key: string) {
  const [bookId, chapter, verse] = key.split('.');
  return {
    key,
    bookId: bookId ?? '',
    chapter: Number(chapter),
    verse: Number(verse),
    text: '',
  };
}

/**
 * Supply a complete mock range with matching keys and a display reference.
 */
function successfulPassage(selection: PassageSelection): BibleRepositoryResult<BiblePassage> {
  const start = verseForKey(selection.startVerseKey);
  const end = verseForKey(selection.endVerseKey);
  const verses = Array.from({ length: end.verse - start.verse + 1 }, (_, index) =>
    verseForKey(`${start.bookId}.${start.chapter}.${start.verse + index}`),
  );
  const bookName = BOOKS.find((book) => book.id === start.bookId)?.name ?? start.bookId;
  const reference = `${bookName} ${start.chapter}:${start.verse}${start.verse === end.verse ? '' : `–${end.verse}`}`;
  return { ok: true, value: { reference, verses } };
}

function makeRepository(response?: BibleRepositoryResult<BiblePassage>) {
  const getPassage = jest.fn(async (selection: PassageSelection) => {
    return response ?? successfulPassage(selection);
  });
  const repository: BibleRepository = {
    getBooks: async () => ({ ok: true, value: BOOKS }),
    getChapter: async () => ({ ok: true, value: [] }),
    getPassage,
  };

  return { repository, getPassage };
}

describe('resolveBibleReference parses full book names and builds canonical keys', () => {
  it('accepts normalized numbered names, ranges, single verses, and empty text', async () => {
    const { repository, getPassage } = makeRepository();

    await expect(
      resolveBibleReference('  1   JOHN  3 : 16 – 18  ', BOOKS, repository),
    ).resolves.toEqual({
      ok: true,
      value: {
        bookId: '1JN',
        chapter: 3,
        selection: { startVerseKey: '1JN.3.16', endVerseKey: '1JN.3.18' },
      },
    });
    await expect(resolveBibleReference('john 3:16', BOOKS, repository)).resolves.toEqual({
      ok: true,
      value: {
        bookId: 'JHN',
        chapter: 3,
        selection: { startVerseKey: 'JHN.3.16', endVerseKey: 'JHN.3.16' },
      },
    });
    expect(getPassage.mock.calls.map(([selection]) => selection)).toEqual([
      { startVerseKey: '1JN.3.16', endVerseKey: '1JN.3.18' },
      { startVerseKey: 'JHN.3.16', endVerseKey: 'JHN.3.16' },
    ]);
  });
});

describe('resolveBibleReference rejects unsupported syntax and unknown names', () => {
  it('returns the appropriate format or book error without querying the repository', async () => {
    const { repository, getPassage } = makeRepository();
    const cases = [
      ['John 3', 'invalid_format'],
      ['John 3:16-4:2', 'invalid_format'],
      ['John 3:16 note', 'invalid_format'],
      ['Jhn 3:16', 'unknown_book'],
      ['Genesis 1:1', 'unknown_book'],
    ] as const;

    for (const [input, code] of cases) {
      await expect(resolveBibleReference(input, BOOKS, repository)).resolves.toEqual({
        ok: false,
        code,
      });
    }
    expect(getPassage).not.toHaveBeenCalled();
  });
});

describe('resolveBibleReference enforces numeric selection bounds', () => {
  it('rejects non-positive, unsafe, out-of-book, and descending selections', async () => {
    const { repository, getPassage } = makeRepository();
    const invalidReferences = [
      'John 0:1',
      'John 22:1',
      'John 9007199254740992:1',
      'John 3:0',
      'John 3:9007199254740992',
      'John 3:18-17',
    ];

    for (const input of invalidReferences) {
      await expect(resolveBibleReference(input, BOOKS, repository)).resolves.toEqual({
        ok: false,
        code: 'invalid_selection',
      });
    }
    expect(getPassage).not.toHaveBeenCalled();
  });
});

describe('resolveBibleReference requires repository passage validation', () => {});
