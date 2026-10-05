/**
 * Defines the operations for reading Bible books, chapters and passages.
 * Lets callers use Bible data without depending on SQLite.
 */
import type { BibleBook } from '../models/BibleBook';
import type { BiblePassage } from '../models/BiblePassage';
import type { BibleVerse } from '../models/BibleVerse';
import type { PassageSelection } from '../models/PassageSelection';

export type BibleRepositoryErrorCode = 'invalid_selection' | 'unavailable';

export type BibleRepositoryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: BibleRepositoryErrorCode };

export interface BibleRepository {
  getBooks(): Promise<BibleRepositoryResult<readonly BibleBook[]>>;

  /** Returns verses in canonical order, or `invalid_selection` for an unknown book or chapter. */
  getChapter(
    bookId: string,
    chapter: number,
  ): Promise<BibleRepositoryResult<readonly BibleVerse[]>>;

  /** Resolves the inclusive key range after validating both keys and their canonical order. */
  getPassage(selection: PassageSelection): Promise<BibleRepositoryResult<BiblePassage>>;
}
