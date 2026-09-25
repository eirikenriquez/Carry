export interface PassageSelection {
  // Stable keys reference the bundled Bible dataset without duplicating its text.
  readonly startVerseKey: string;
  readonly endVerseKey: string;
}
