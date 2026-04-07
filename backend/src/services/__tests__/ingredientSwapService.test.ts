// backend/src/services/__tests__/ingredientSwapService.test.ts

import { getIngredientSwaps } from '../ingredientSwapService';

describe('getIngredientSwaps', () => {
  it('returns ≥3 alternatives for chicken breast', () => {
    const swaps = getIngredientSwaps('chicken breast');
    expect(swaps.length).toBeGreaterThanOrEqual(3);
  });

  it('each swap has an alternative, macroDelta, and flavorNote', () => {
    const swaps = getIngredientSwaps('chicken breast');
    for (const swap of swaps) {
      expect(typeof swap.alternative).toBe('string');
      expect(typeof swap.macroDelta).toBe('object');
      expect(typeof swap.flavorNote).toBe('string');
    }
  });

  it('returns ≥3 alternatives for white rice', () => {
    const swaps = getIngredientSwaps('white rice');
    expect(swaps.length).toBeGreaterThanOrEqual(3);
  });

  it('returns ≥3 alternatives for sour cream', () => {
    const swaps = getIngredientSwaps('sour cream');
    expect(swaps.length).toBeGreaterThanOrEqual(3);
  });

  it('is case-insensitive', () => {
    const a = getIngredientSwaps('Chicken Breast');
    const b = getIngredientSwaps('chicken breast');
    expect(a).toEqual(b);
  });

  it('matches ingredient aliases (e.g. "chicken breasts")', () => {
    const swaps = getIngredientSwaps('chicken breasts');
    expect(swaps.length).toBeGreaterThanOrEqual(3);
  });

  it('returns empty array for unknown ingredient', () => {
    const swaps = getIngredientSwaps('purple moon rock');
    expect(swaps).toEqual([]);
  });

  it('filters out meat swaps for vegan restrictions', () => {
    const swaps = getIngredientSwaps('chicken breast', ['vegan']);
    for (const swap of swaps) {
      // Vegan swaps should not include meat alternatives
      const lower = swap.alternative.toLowerCase();
      expect(lower).not.toMatch(/\b(chicken|turkey|beef|pork|fish|salmon|tuna)\b/);
    }
  });

  it('returns vegan alternatives for chicken breast', () => {
    const swaps = getIngredientSwaps('chicken breast', ['vegan']);
    expect(swaps.length).toBeGreaterThanOrEqual(1);
  });

  it('filters out dairy swaps for dairy-free restrictions', () => {
    const swaps = getIngredientSwaps('butter', ['dairy-free']);
    for (const swap of swaps) {
      const lower = swap.alternative.toLowerCase();
      expect(lower).not.toMatch(/\b(butter|cream|milk|cheese|yogurt)\b/);
    }
  });

  it('includes macroDelta values as numbers', () => {
    const swaps = getIngredientSwaps('white rice');
    for (const swap of swaps) {
      for (const val of Object.values(swap.macroDelta)) {
        expect(typeof val).toBe('number');
      }
    }
  });

  it('returns ≤5 alternatives per ingredient', () => {
    const swaps = getIngredientSwaps('chicken breast');
    expect(swaps.length).toBeLessThanOrEqual(5);
  });

  it('matches partial ingredient text from recipe (e.g. "2 cups white rice")', () => {
    const swaps = getIngredientSwaps('2 cups white rice');
    expect(swaps.length).toBeGreaterThanOrEqual(3);
  });
});
