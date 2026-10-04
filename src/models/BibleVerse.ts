export interface BibleVerse {
  /** Stable USFM-style key, for example `JAS.1.19`. */
  readonly key: string;
  readonly bookId: string;
  readonly chapter: number;
  readonly verse: number;
  readonly text: string;
}
