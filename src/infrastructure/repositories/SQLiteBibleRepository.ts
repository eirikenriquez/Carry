import type { SQLiteDatabase } from 'expo-sqlite';
import type { BibleBook } from '../../domain/entities/BibleBook';
import type { BiblePassage } from '../../domain/entities/BiblePassage';
import type { BibleVerse } from '../../domain/entities/BibleVerse';
import type { PassageSelection } from '../../domain/entities/PassageSelection';
import type {
  BibleRepository,
  BibleRepositoryResult,
} from '../../application/ports/BibleRepository';

type BibleDatabase = Pick<SQLiteDatabase, 'getAllAsync' | 'getFirstAsync'>;

interface VerseRow extends BibleVerse {
  readonly verseOrder: number;
}

interface PassageEndpoint extends VerseRow {
  readonly bookName: string;
}

const VERSE_KEY_PATTERN = /^[1-3]?[A-Z]{2,3}\.[1-9]\d*\.[1-9]\d*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate a raw database row before returning book metadata.
 */
function parseBook(row: unknown): BibleBook | null {
  if (
    !isRecord(row) ||
    !isNonEmptyString(row.id) ||
    !isNonEmptyString(row.name) ||
    !isPositiveInteger(row.bookOrder) ||
    !isPositiveInteger(row.chapterCount)
  ) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    order: row.bookOrder,
    chapterCount: row.chapterCount,
  };
}

/**
 * Validate a verse row and check that its key matches the stored fields.
 */
function parseVerseRow(row: unknown): VerseRow | null {
  if (
    !isRecord(row) ||
    typeof row.key !== 'string' ||
    !VERSE_KEY_PATTERN.test(row.key) ||
    !isNonEmptyString(row.bookId) ||
    !isPositiveInteger(row.chapter) ||
    !isPositiveInteger(row.verse) ||
    typeof row.text !== 'string' ||
    !isPositiveInteger(row.verseOrder)
  ) {
    return null;
  }

  const [keyBookId, keyChapter, keyVerse] = row.key.split('.');
  if (
    keyBookId !== row.bookId ||
    Number(keyChapter) !== row.chapter ||
    Number(keyVerse) !== row.verse
  ) {
    return null;
  }

  return {
    key: row.key,
    bookId: row.bookId,
    chapter: row.chapter,
    verse: row.verse,
    text: row.text,
    verseOrder: row.verseOrder,
  };
}

/**
 * Validate an endpoint row, including the book name used in display references.
 */
function parseEndpoint(row: unknown): PassageEndpoint | null {
  const verse = parseVerseRow(row);
  if (!verse || !isRecord(row) || !isNonEmptyString(row.bookName)) {
    return null;
  }

  return { ...verse, bookName: row.bookName };
}

/**
 * Validate ordered verse rows and reject gaps in canonical order.
 */
function parseVerseRows(rows: unknown): VerseRow[] | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const verses: VerseRow[] = [];
  for (const row of rows) {
    const verse = parseVerseRow(row);
    const previousVerse = verses[verses.length - 1];
    if (!verse || (previousVerse && verse.verseOrder !== previousVerse.verseOrder + 1)) {
      return null;
    }
    verses.push(verse);
  }
  return verses;
}

/**
 * Remove database-only ordering metadata from verses returned to callers.
 */
function toBibleVerses(rows: readonly VerseRow[]): BibleVerse[] {
  return rows.map(({ verseOrder: _verseOrder, ...verse }) => verse);
}

/**
 * Format a passage reference across verse, chapter, or book boundaries.
 */
function buildReference(start: PassageEndpoint, end: PassageEndpoint): string {
  const startReference = `${start.bookName} ${start.chapter}:${start.verse}`;
  if (start.key === end.key) {
    return startReference;
  }

  if (start.bookId !== end.bookId) {
    return `${startReference}–${end.bookName} ${end.chapter}:${end.verse}`;
  }

  if (start.chapter !== end.chapter) {
    return `${startReference}–${end.chapter}:${end.verse}`;
  }

  return `${startReference}–${end.verse}`;
}

function unavailable<T>(): BibleRepositoryResult<T> {
  return { ok: false, code: 'unavailable' };
}

function invalidSelection<T>(): BibleRepositoryResult<T> {
  return { ok: false, code: 'invalid_selection' };
}

export class SQLiteBibleRepository implements BibleRepository {
  constructor(private readonly database: BibleDatabase) {}

  /**
   * Read and validate one passage endpoint using its canonical key.
   */
  private async getEndpoint(key: string): Promise<BibleRepositoryResult<PassageEndpoint>> {
    const row = await this.database.getFirstAsync<unknown>(
      `SELECT
        v.key,
        v.book_id AS bookId,
        v.chapter,
        v.verse,
        v.text,
        v.verse_order AS verseOrder,
        b.name AS bookName
      FROM verses AS v
      LEFT JOIN books AS b ON b.id = v.book_id
      WHERE v.key = ?`,
      key,
    );

    if (row === null) {
      return invalidSelection();
    }
    const endpoint = parseEndpoint(row);
    return endpoint ? { ok: true, value: endpoint } : unavailable();
  }

  /**
   * Read the catalogue in canonical order, rejecting invalid or duplicate books.
   */
  async getBooks(): Promise<BibleRepositoryResult<readonly BibleBook[]>> {
    try {
      const rows = await this.database.getAllAsync<unknown>(
        `SELECT
          id,
          name,
          book_order AS bookOrder,
          chapter_count AS chapterCount
        FROM books
        ORDER BY book_order ASC`,
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        return unavailable();
      }

      const books: BibleBook[] = [];
      const bookIds = new Set<string>();
      let previousOrder = 0;
      for (const row of rows) {
        const book = parseBook(row);
        if (!book || book.order <= previousOrder || bookIds.has(book.id)) {
          return unavailable();
        }
        books.push(book);
        bookIds.add(book.id);
        previousOrder = book.order;
      }

      return { ok: true, value: books };
    } catch {
      return unavailable();
    }
  }

  /**
   * Validate the requested chapter and read its verses in canonical order.
   */
  async getChapter(
    bookId: string,
    chapter: number,
  ): Promise<BibleRepositoryResult<readonly BibleVerse[]>> {
    if (!isNonEmptyString(bookId) || !isPositiveInteger(chapter)) {
      return invalidSelection();
    }

    try {
      const bookRow = await this.database.getFirstAsync<unknown>(
        `SELECT id, chapter_count AS chapterCount
        FROM books
        WHERE id = ?`,
        bookId,
      );
      if (bookRow === null) {
        return invalidSelection();
      }
      if (!isRecord(bookRow) || bookRow.id !== bookId || !isPositiveInteger(bookRow.chapterCount)) {
        return unavailable();
      }
      if (chapter > bookRow.chapterCount) {
        return invalidSelection();
      }

      const rows = await this.database.getAllAsync<unknown>(
        `SELECT
          key,
          book_id AS bookId,
          chapter,
          verse,
          text,
          verse_order AS verseOrder
        FROM verses
        WHERE book_id = ? AND chapter = ?
        ORDER BY verse_order ASC`,
        bookId,
        chapter,
      );
      const parsedVerses = parseVerseRows(rows);
      if (!parsedVerses) {
        return unavailable();
      }
      for (const verse of parsedVerses) {
        if (verse.bookId !== bookId || verse.chapter !== chapter) {
          return unavailable();
        }
      }

      return { ok: true, value: toBibleVerses(parsedVerses) };
    } catch {
      return unavailable();
    }
  }

  /**
   * Resolve an inclusive passage after validating its endpoints and completeness.
   */
  async getPassage(selection: PassageSelection): Promise<BibleRepositoryResult<BiblePassage>> {
    try {
      if (
        !selection ||
        !VERSE_KEY_PATTERN.test(selection.startVerseKey) ||
        !VERSE_KEY_PATTERN.test(selection.endVerseKey)
      ) {
        return invalidSelection();
      }

      const startResult = await this.getEndpoint(selection.startVerseKey);
      if (!startResult.ok) {
        return startResult;
      }
      const endResult = await this.getEndpoint(selection.endVerseKey);
      if (!endResult.ok) {
        return endResult;
      }
      const { value: start } = startResult;
      const { value: end } = endResult;
      if (start.verseOrder > end.verseOrder) {
        return invalidSelection();
      }
      if (start.verseOrder === end.verseOrder && start.key !== end.key) {
        return unavailable();
      }

      const rows = await this.database.getAllAsync<unknown>(
        `SELECT
          key,
          book_id AS bookId,
          chapter,
          verse,
          text,
          verse_order AS verseOrder
        FROM verses
        WHERE verse_order >= ? AND verse_order <= ?
        ORDER BY verse_order ASC`,
        start.verseOrder,
        end.verseOrder,
      );
      const parsedVerses = parseVerseRows(rows);
      // Valid endpoints alone cannot detect missing rows inside the range.
      if (!parsedVerses || parsedVerses.length !== end.verseOrder - start.verseOrder + 1) {
        return unavailable();
      }

      const verses = toBibleVerses(parsedVerses);

      if (verses[0].key !== start.key || verses[verses.length - 1].key !== end.key) {
        return unavailable();
      }

      return {
        ok: true,
        value: {
          reference: buildReference(start, end),
          verses,
        },
      };
    } catch {
      return unavailable();
    }
  }
}
