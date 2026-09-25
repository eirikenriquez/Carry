import { normalizeCategoryName } from '../normalizeCategoryName';

describe('normalizeCategoryName', () => {
  it.each([
    ['  Work Stress  ', 'work stress'],
    ['WORK STRESS', 'work stress'],
    ['Work   Stress', 'work stress'],
    ['Work\tStress', 'work stress'],
  ])('normalizes equivalent category names', (name, expected) => {
    expect(normalizeCategoryName(name)).toBe(expected);
  });
});
