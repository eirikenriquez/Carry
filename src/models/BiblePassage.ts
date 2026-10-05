/**
 * Defines a Bible passage as a reference and its verses.
 * It uses the verse model for each item in the passage.
 */
import type { BibleVerse } from './BibleVerse';

export interface BiblePassage {
  readonly reference: string;
  readonly verses: readonly BibleVerse[];
}
