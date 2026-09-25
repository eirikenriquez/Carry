export type AlignmentRating = 1 | 2 | 3 | 4 | 5;

export interface Reflection {
  readonly id: string;
  readonly alignmentRating: AlignmentRating;
  readonly whatOccurred: string;
  readonly insight: string;
  readonly createdAt: Date;
}
