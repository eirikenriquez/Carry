import type { BibleVerse } from './BibleVerse';

export interface BiblePassage {
  readonly reference: string;
  readonly verses: readonly BibleVerse[];
}
