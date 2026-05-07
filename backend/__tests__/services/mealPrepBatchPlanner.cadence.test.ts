// ROADMAP 4.0 WK3.2 — composePrepShoppingList test (prep + IG3 cadence overlay).

import { composePrepShoppingList } from '../../src/services/recommender/mealPrepShoppingListComposer';
import type { MealPrepBatchPlan } from '../../src/services/recommender/mealPrepBatchPlanner';

const samplePlan: MealPrepBatchPlan = {
  ingredientsToBatch: [
    { ingredient: 'brown rice', frequency: 5, estimatedMinutes: 25 },
    { ingredient: 'roasted veg', frequency: 3, estimatedMinutes: 30 },
  ],
  estimatedMinutes: 55,
  coversMeals: 5,
  breakdown: '3 lunches + 2 dinners',
};

const cadenceMilk = {
  ingredientName: 'milk',
  daysSinceLastPurchase: 8,
  ratio: 1.14,
  confidence: 'high' as const,
};
const cadenceEggs = {
  ingredientName: 'eggs',
  daysSinceLastPurchase: 5,
  ratio: 0.95,
  confidence: 'medium' as const,
};
const cadenceRice = {
  ingredientName: 'Brown Rice',
  daysSinceLastPurchase: 12,
  ratio: 1.2,
  confidence: 'high' as const,
};

describe('WK3.2 — composePrepShoppingList', () => {
  it('contains both prep ingredients and running-low items, tagged distinctly', () => {
    const result = composePrepShoppingList({
      batchPlan: samplePlan,
      runningLow: [cadenceMilk, cadenceEggs],
    });
    const sources = result.items.map((i) => i.source);
    expect(sources).toContain('prep');
    expect(sources).toContain('cadence');
    expect(result.prepCount).toBe(2);
    expect(result.cadenceCount).toBe(2);
  });

  it('lists prep items first, then cadence items', () => {
    const result = composePrepShoppingList({
      batchPlan: samplePlan,
      runningLow: [cadenceMilk, cadenceEggs],
    });
    const firstPrepIdx = result.items.findIndex((i) => i.source === 'prep');
    const lastPrepIdx = result.items.map((i) => i.source).lastIndexOf('prep');
    const firstCadenceIdx = result.items.findIndex((i) => i.source === 'cadence');
    expect(firstPrepIdx).toBeLessThan(firstCadenceIdx);
    expect(lastPrepIdx).toBeLessThan(firstCadenceIdx);
  });

  it('unifies an ingredient that appears in both — single prep row with cadenceFlagged=true', () => {
    const result = composePrepShoppingList({
      batchPlan: samplePlan,
      runningLow: [cadenceRice, cadenceMilk], // "Brown Rice" overlaps with prep
    });
    const riceRows = result.items.filter(
      (i) => i.ingredient.toLowerCase().trim() === 'brown rice',
    );
    expect(riceRows).toHaveLength(1);
    expect(riceRows[0].source).toBe('prep');
    expect(riceRows[0].cadenceFlagged).toBe(true);
    expect(riceRows[0].cadenceRatio).toBe(1.2);
    expect(riceRows[0].cadenceConfidence).toBe('high');
    // Milk should still appear as a cadence row.
    const milk = result.items.find((i) => i.ingredient === 'milk');
    expect(milk?.source).toBe('cadence');
  });

  it('handles a null batch plan (no prep block proposed) — cadence-only list', () => {
    const result = composePrepShoppingList({
      batchPlan: null,
      runningLow: [cadenceMilk, cadenceEggs],
    });
    expect(result.prepCount).toBe(0);
    expect(result.cadenceCount).toBe(2);
    expect(result.items.every((i) => i.source === 'cadence')).toBe(true);
  });

  it('handles empty runningLow — prep-only list', () => {
    const result = composePrepShoppingList({
      batchPlan: samplePlan,
      runningLow: [],
    });
    expect(result.prepCount).toBe(2);
    expect(result.cadenceCount).toBe(0);
    expect(result.items.every((i) => i.source === 'prep')).toBe(true);
  });

  it('returns empty list when both inputs are empty', () => {
    const result = composePrepShoppingList({
      batchPlan: null,
      runningLow: [],
    });
    expect(result.items).toEqual([]);
    expect(result.prepCount).toBe(0);
    expect(result.cadenceCount).toBe(0);
  });

  it('case-insensitive overlap detection (Brown Rice vs brown rice)', () => {
    const result = composePrepShoppingList({
      batchPlan: samplePlan,
      runningLow: [cadenceRice], // "Brown Rice" — overlap
    });
    const cadenceRows = result.items.filter((i) => i.source === 'cadence');
    expect(cadenceRows).toHaveLength(0);
    expect(result.items[0].cadenceFlagged).toBe(true);
  });

  it('deduplicates duplicate cadence entries (defensive — IG3.2 should not emit dupes)', () => {
    const result = composePrepShoppingList({
      batchPlan: null,
      runningLow: [cadenceMilk, cadenceMilk, cadenceMilk],
    });
    expect(result.cadenceCount).toBe(1);
    expect(result.items[0].ingredient).toBe('milk');
  });

  it('preserves frequency + estimatedMinutes on prep rows', () => {
    const result = composePrepShoppingList({
      batchPlan: samplePlan,
      runningLow: [],
    });
    const rice = result.items.find((i) => i.ingredient === 'brown rice');
    expect(rice?.frequency).toBe(5);
    expect(rice?.estimatedMinutes).toBe(25);
  });

  it('preserves cadenceRatio + cadenceConfidence on cadence-only rows', () => {
    const result = composePrepShoppingList({
      batchPlan: null,
      runningLow: [cadenceEggs],
    });
    const eggs = result.items[0];
    expect(eggs.source).toBe('cadence');
    expect(eggs.cadenceRatio).toBe(0.95);
    expect(eggs.cadenceConfidence).toBe('medium');
  });

  it('does not mutate input batchPlan or runningLow', () => {
    const lows = [cadenceMilk, cadenceEggs];
    const before = JSON.stringify(lows);
    const planCopy = JSON.stringify(samplePlan);
    composePrepShoppingList({
      batchPlan: samplePlan,
      runningLow: lows,
    });
    expect(JSON.stringify(lows)).toBe(before);
    expect(JSON.stringify(samplePlan)).toBe(planCopy);
  });

  it('skips empty / whitespace-only ingredient names', () => {
    const result = composePrepShoppingList({
      batchPlan: null,
      runningLow: [
        { ingredientName: '' },
        { ingredientName: '   ' },
        cadenceMilk,
      ],
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].ingredient).toBe('milk');
  });
});
