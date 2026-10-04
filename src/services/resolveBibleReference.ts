import type { BibleRepository } from '../repositories/BibleRepository';
import type { BibleBook } from '../models/BibleBook';
import type { PassageSelection } from '../models/PassageSelection';

export interface ReferenceTarget {
  readonly bookId: string;
  readonly chapter: number;
  readonly selection: PassageSelection;
}

type ReferenceErrorCode = 'invalid_format' | 'unknown_book' | 'invalid_selection' | 'unavailable';

type ReferenceLookupResult =
  | { readonly ok: true; readonly value: ReferenceTarget }
  | { readonly ok: false; readonly code: ReferenceErrorCode };

const REFERENCE_PATTERN = /^(.*?)\s+(\d+)\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?$/u;

function normalizeBookName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function failure(code: ReferenceErrorCode): ReferenceLookupResult {
  return { ok: false, code };
}

/**
 * Parse a full-name reference and validate its verse keys through the repository.
 */
export async function resolveBibleReference(
  input: string,
  books: readonly BibleBook[],
  repository: BibleRepository,
): Promise<ReferenceLookupResult> {
  const match = REFERENCE_PATTERN.exec(input.trim());
  if (!match) return failure('invalid_format');

  const [, rawBookName, chapterText, startVerseText, endVerseText] = match;
  const normalizedBookName = normalizeBookName(rawBookName);
  const matchingBooks = books.filter(
    (book) => typeof book.name === 'string' && normalizeBookName(book.name) === normalizedBookName,
  );

  if (matchingBooks.length === 0) return failure('unknown_book');
  if (matchingBooks.length > 1) return failure('unavailable');

  const book = matchingBooks[0];
  if (
    typeof book.id !== 'string' ||
    book.id.length === 0 ||
    !isPositiveSafeInteger(book.chapterCount)
  ) {
    return failure('unavailable');
  }

  const chapter = Number(chapterText);
  const startVerse = Number(startVerseText);
  const endVerse = endVerseText === undefined ? startVerse : Number(endVerseText);
  if (
    !isPositiveSafeInteger(chapter) ||
    !isPositiveSafeInteger(startVerse) ||
    !isPositiveSafeInteger(endVerse) ||
    chapter > book.chapterCount ||
    startVerse > endVerse
  ) {
    return failure('invalid_selection');
  }

  const selection: PassageSelection = {
    startVerseKey: `${book.id}.${chapter}.${startVerse}`,
    endVerseKey: `${book.id}.${chapter}.${endVerse}`,
  };

  try {
    // Numeric bounds alone cannot confirm that a verse exists in this edition.
    const passage = await repository.getPassage(selection);
    if (passage.ok) {
      return { ok: true, value: { bookId: book.id, chapter, selection } };
    }
    return failure(passage.code === 'invalid_selection' ? 'invalid_selection' : 'unavailable');
  } catch {
    return failure('unavailable');
  }
}
