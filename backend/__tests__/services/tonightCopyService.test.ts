// ROADMAP 4.0 T1.2 — tonightCopyService unit tests.
//
// Verifies every supported context shape produces a non-empty line ≤120 chars,
// banned-vocab lint passes, and the function is deterministic for fixed input.

import { generateCopyLine } from '../../src/services/recommender/tonightCopyService';

const BANNED = ['cut', 'bulk', 'maintain', 'crush', 'under your', 'macro-friendly'];

const containsBanned = (line: string): string | null => {
  const lower = line.toLowerCase();
  for (const word of BANNED) {
    if (lower.includes(word)) return word;
  }
  return null;
};

describe('tonightCopyService.generateCopyLine (T1.2)', () => {
  it('expiring-ingredient context produces a non-empty line ≤120 chars', () => {
    const line = generateCopyLine({
      expiringIngredient: 'chicken thighs',
      dayOfWeek: 'Tuesday',
      cuisine: 'persian',
      cookTime: 24,
    });
    expect(line.length).toBeGreaterThan(0);
    expect(line.length).toBeLessThanOrEqual(120);
    expect(line).toContain('chicken thighs');
  });

  it('cuisine-gap context produces a non-empty line ≤120 chars', () => {
    const line = generateCopyLine({
      lastCuisineGapDays: 11,
      weatherCold: true,
      cuisine: 'korean',
      cookTime: 22,
      dayOfWeek: 'Friday',
    });
    expect(line.length).toBeGreaterThan(0);
    expect(line.length).toBeLessThanOrEqual(120);
  });

  it('day-of-week context produces a non-empty line ≤120 chars', () => {
    const line = generateCopyLine({
      dayOfWeek: 'Sunday',
      cuisine: 'italian',
      cookTime: 35,
    });
    expect(line.length).toBeGreaterThan(0);
    expect(line.length).toBeLessThanOrEqual(120);
    expect(line.toLowerCase()).toContain('sunday');
  });

  it('banned-vocab lint passes for every context shape', () => {
    const contexts = [
      { expiringIngredient: 'lemons', dayOfWeek: 'Monday', cuisine: 'greek', cookTime: 20 },
      { lastCuisineGapDays: 14, weatherCold: true, cuisine: 'thai', cookTime: 18, dayOfWeek: 'Wednesday' },
      { dayOfWeek: 'Friday', cuisine: 'japanese', cookTime: 30 },
      { dayOfWeek: 'Saturday', cuisine: 'mexican', cookTime: 45, weatherCold: false },
    ];
    for (const ctx of contexts) {
      const line = generateCopyLine(ctx);
      const hit = containsBanned(line);
      expect(hit).toBeNull();
    }
  });

  it('deterministic for fixed input — same context always returns same line', () => {
    const ctx = {
      expiringIngredient: 'tomatoes',
      dayOfWeek: 'Thursday',
      cuisine: 'italian',
      cookTime: 25,
    };
    const a = generateCopyLine(ctx);
    const b = generateCopyLine(ctx);
    const c = generateCopyLine(ctx);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('truncates gracefully when inputs would exceed 120 chars', () => {
    const line = generateCopyLine({
      expiringIngredient: 'a-very-long-ingredient-name-that-by-itself-eats-half-the-line',
      dayOfWeek: 'Wednesday',
      cuisine: 'a-very-long-cuisine-string',
      cookTime: 999,
    });
    expect(line.length).toBeLessThanOrEqual(120);
  });
});
