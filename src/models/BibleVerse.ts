/**
 * Defines one verse from the bundled Bible dataset.
 * It stores the stable key, location, and display text for that verse.
 */
export interface BibleVerse {
  /** Stable USFM-style key, for example `JAS.1.19`. */
  readonly key: string;
  readonly bookId: string;
  readonly chapter: number;
  readonly verse: number;
  readonly text: string;
}
