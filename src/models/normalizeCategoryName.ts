/**
 * Provides category name normalization for consistent matching.
 * It trims surrounding whitespace, collapses internal spacing, and lowercases names.
 */
export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
