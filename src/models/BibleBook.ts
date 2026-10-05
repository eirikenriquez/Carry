/**
 * Defines the Bible book data used by the bundled scripture catalogue.
 * It records each book's identifier, display name, order, and chapter count.
 */
export interface BibleBook {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly chapterCount: number;
}
