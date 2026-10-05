/**
 * Defines the verse-key range used to select a passage.
 * It references the bundled Bible dataset without duplicating its text.
 */
export interface PassageSelection {
  // Stable keys reference the bundled Bible dataset without duplicating its text.
  readonly startVerseKey: string;
  readonly endVerseKey: string;
}
