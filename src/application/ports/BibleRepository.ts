import type { BibleBook } from '../../domain/entities/BibleBook';
import type { BiblePassage } from '../../domain/entities/BiblePassage';
import type { BibleVerse } from '../../domain/entities/BibleVerse';
import type { PassageSelection } from '../../domain/entities/PassageSelection';

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
