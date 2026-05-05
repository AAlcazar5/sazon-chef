// backend/__tests__/services/restaurantMacroFitService.test.ts
// ROADMAP 4.0 Tier C13 — Restaurant macro fit (TDD).

import {
  scoreItemFit,
  rankItemsForRemainingMacros,
  type FoodItemFitInput,
  type RemainingMacros,
} from '../../src/services/restaurantMacroFitService';

const item = (overrides: Partial<FoodItemFitInput> = {}): FoodItemFitInput => ({
  id: overrides.id ?? 'item-1',
  name: overrides.name ?? 'Chicken Burrito Bowl',
  brand: overrides.brand ?? 'Chipotle',
  calories: overrides.calories ?? 600,
  protein: overrides.protein ?? 40,
  carbs: overrides.carbs ?? 50,
  fat: overrides.fat ?? 20,
  fiber: overrides.fiber ?? 8,
});

const remaining: RemainingMacros = {
  calories: 600,
  protein: 40,
  carbs: 80,
  fat: 30,
  fiber: 15,
};

describe('scoreItemFit', () => {
  it('returns a perfect score (1.0) for an item that exactly matches remaining', () => {
    const score = scoreItemFit(
      item({ calories: 600, protein: 40, carbs: 80, fat: 30 }),
      remaining
    );
    expect(score).toBeCloseTo(1, 1);
  });

  it('penalizes items that exceed calorie budget', () => {
    const overScore = scoreItemFit(item({ calories: 1200 }), remaining);
    const underScore = scoreItemFit(item({ calories: 600 }), remaining);
    expect(overScore).toBeLessThan(underScore);
  });

  it('rewards higher protein when protein remaining is positive', () => {
    const lowProtein = scoreItemFit(item({ protein: 15 }), remaining);
    const highProtein = scoreItemFit(item({ protein: 40 }), remaining);
    expect(highProtein).toBeGreaterThan(lowProtein);
  });

  it('treats negative remaining macros (already over) as anti-targets', () => {
    const overState: RemainingMacros = { calories: -200, protein: -10, carbs: 0, fat: 0 };
    const heavy = scoreItemFit(item({ calories: 800 }), overState);
    const light = scoreItemFit(item({ calories: 300 }), overState);
    // When already over, lighter items should rank higher.
    expect(light).toBeGreaterThan(heavy);
  });

  it('returns score in [0, 1]', () => {
    for (let i = 0; i < 5; i++) {
      const s = scoreItemFit(
        item({
          calories: 200 * (i + 1),
          protein: 10 * (i + 1),
        }),
        remaining
      );
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

describe('rankItemsForRemainingMacros', () => {
  it('returns items sorted by fit score, descending', () => {
    const items: FoodItemFitInput[] = [
      item({ id: 'huge', name: 'Burrito XXL', calories: 1500, protein: 50 }),
      item({ id: 'fit', name: 'Salad Bowl', calories: 580, protein: 38 }),
      item({ id: 'tiny', name: 'Side Salad', calories: 150, protein: 5 }),
    ];
    const ranked = rankItemsForRemainingMacros(items, remaining);
    expect(ranked).toHaveLength(3);
    // The fit item should rank first (closest to remaining)
    expect(ranked[0].id).toBe('fit');
    // Each item should be annotated with fitScore
    expect(ranked[0].fitScore).toBeGreaterThan(ranked[1].fitScore);
  });

  it('returns at most `limit` items when limit is provided', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      item({ id: `item-${i}`, calories: 200 + i * 100 })
    );
    const ranked = rankItemsForRemainingMacros(items, remaining, { limit: 3 });
    expect(ranked).toHaveLength(3);
  });

  it('respects dietaryRestrictions — filters items whose name contains a banned word', () => {
    const items: FoodItemFitInput[] = [
      item({ id: '1', name: 'Cheese Pizza' }),
      item({ id: '2', name: 'Veggie Burrito Bowl' }),
    ];
    const ranked = rankItemsForRemainingMacros(items, remaining, {
      dietaryRestrictions: ['cheese'],
    });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe('2');
  });

  it('returns an empty array when items list is empty', () => {
    expect(rankItemsForRemainingMacros([], remaining)).toEqual([]);
  });

  it('annotates with explainer copy ("fits well", "over by X cal")', () => {
    const items: FoodItemFitInput[] = [
      item({ id: 'fit', calories: 580 }),
      item({ id: 'over', calories: 900 }),
    ];
    const ranked = rankItemsForRemainingMacros(items, remaining);
    const fit = ranked.find((r) => r.id === 'fit');
    const over = ranked.find((r) => r.id === 'over');
    expect(fit?.explainer).toMatch(/fits|under/i);
    expect(over?.explainer).toMatch(/over by/i);
  });
});
