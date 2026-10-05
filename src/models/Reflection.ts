/**
 * Defines reflection data attached to a completed Carry.
 * It records a rating, written notes, and the time the reflection was created.
 */
export type AlignmentRating = 1 | 2 | 3 | 4 | 5;

export interface Reflection {
  readonly id: string;
  readonly alignmentRating: AlignmentRating;
  readonly whatOccurred: string;
  readonly insight: string;
  readonly createdAt: Date;
}
