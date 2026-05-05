// backend/__tests__/services/weeklyRecapService.test.ts
// ROADMAP 4.0 Tier C9 — Weekly recap card service (TDD).

import {
  computeTopCuisine,
  computeTopIngredient,
  computeTopNutrient,
  computeDiscovery,
  buildWeeklyRecap,
  type RecapInputs,
} from '../../src/services/weeklyRecapService';

const sampleCooks = [
  { recipeId: 'r1', cuisine: 'Persian', cookedAt: new Date('2026-04-30') },
  { recipeId: 'r2', cuisine: 'Persian', cookedAt: new Date('2026-04-29') },
  { recipeId: 'r3', cuisine: 'Salvadorean', cookedAt: new Date('2026-04-28') },
  { recipeId: 'r4', cuisine: 'Persian', cookedAt: new Date('2026-04-27') },
  { recipeId: 'r5', cuisine: 'Lebanese', cookedAt: new Date('2026-04-26') },
];

const sampleIngredients = [
  { name: 'saffron', count: 4 },
  { name: 'pomegranate', count: 3 },
  { name: 'parsley', count: 6 },
  { name: 'olive oil', count: 7 }, // staple — should be excluded
  { name: 'salt', count: 7 },      // staple — should be excluded
];

const sampleNutrientTotals = {
  fiber: 220, // 7 days × ~31g
  iron: 45,
  magnesium: 380,
  vitaminK: 600,
  potassium: 1400,
  b12: 8,
};

describe('computeTopCuisine', () => {
  it('returns the cuisine with the most cooks', () => {
    const top = computeTopCuisine(sampleCooks);
    expect(top?.cuisine).toBe('Persian');
    expect(top?.count).toBe(3);
  });

  it('returns null when no cooks', () => {
    expect(computeTopCuisine([])).toBeNull();
  });

  it('breaks ties alphabetically (deterministic)', () => {
    const cooks = [
      { recipeId: 'r1', cuisine: 'Italian', cookedAt: new Date() },
      { recipeId: 'r2', cuisine: 'Greek', cookedAt: new Date() },
    ];
    const top = computeTopCuisine(cooks);
    expect(top?.cuisine).toBe('Greek');
  });
});

describe('computeTopIngredient', () => {
  it('returns the highest-count ingredient excluding kitchen staples', () => {
    const top = computeTopIngredient(sampleIngredients);
    expect(top?.name).toBe('parsley');
    expect(top?.count).toBe(6);
  });

  it('skips configured staples (salt, pepper, oil)', () => {
    const ingredients = [
      { name: 'salt', count: 10 },
      { name: 'olive oil', count: 10 },
      { name: 'cumin', count: 4 },
    ];
    const top = computeTopIngredient(ingredients);
    expect(top?.name).toBe('cumin');
  });

  it('returns null when only staples present', () => {
    expect(
      computeTopIngredient([{ name: 'salt', count: 10 }, { name: 'water', count: 10 }])
    ).toBeNull();
  });

  it('returns null on empty input', () => {
    expect(computeTopIngredient([])).toBeNull();
  });
});

describe('computeTopNutrient', () => {
  it('returns the nutrient that exceeded its weekly target by the most %DV', () => {
    // Targets chosen so magnesium has highest pct-of-target among those that
    // exceed: fiber 220/175=126%, magnesium 380/280=136% (winner),
    // iron 45/56=80% (excluded), potassium 1400/3500=40% (excluded),
    // b12 8/10=80% (excluded), vitaminK 600/1000=60% (excluded).
    const targets = { fiber: 175, iron: 56, magnesium: 280, potassium: 3500, b12: 10, vitaminK: 1000 };
    const top = computeTopNutrient(sampleNutrientTotals, targets);
    expect(top?.name).toBe('magnesium');
  });

  it('returns null when nothing exceeds its target', () => {
    const totals = { fiber: 50 };
    const targets = { fiber: 175 };
    expect(computeTopNutrient(totals, targets)).toBeNull();
  });

  it('returns null when targets are empty', () => {
    expect(computeTopNutrient(sampleNutrientTotals, {} as any)).toBeNull();
  });
});

describe('computeDiscovery', () => {
  it('returns a "first cook" cuisine when newCuisinesThisWeek is non-empty', () => {
    const discovery = computeDiscovery({
      newCuisinesThisWeek: ['Burmese', 'Filipino'],
      newIngredientsThisWeek: [],
    });
    expect(discovery).toMatch(/first time|new cuisine|Burmese|Filipino/);
  });

  it('returns a "new ingredient" message when no new cuisine but a new ingredient', () => {
    const discovery = computeDiscovery({
      newCuisinesThisWeek: [],
      newIngredientsThisWeek: ['fenugreek'],
    });
    expect(discovery).toMatch(/fenugreek|new ingredient/);
  });

  it('returns null when nothing new this week', () => {
    expect(
      computeDiscovery({
        newCuisinesThisWeek: [],
        newIngredientsThisWeek: [],
      })
    ).toBeNull();
  });
});

describe('buildWeeklyRecap', () => {
  const baseInputs: RecapInputs = {
    userId: 'user-1',
    weekStart: new Date('2026-04-26'),
    weekEnd: new Date('2026-05-02'),
    cooks: sampleCooks,
    ingredients: sampleIngredients,
    nutrientTotals: sampleNutrientTotals,
    nutrientTargets: { fiber: 175, iron: 56, magnesium: 280, potassium: 3500, b12: 10, vitaminK: 1000 },
    newCuisinesThisWeek: ['Lebanese'],
    newIngredientsThisWeek: ['pomegranate'],
  };

  it('returns a card with topCuisine, topIngredient, topNutrient, discovery', () => {
    const card = buildWeeklyRecap(baseInputs);
    expect(card.topCuisine).toEqual({ cuisine: 'Persian', count: 3 });
    expect(card.topIngredient?.name).toBe('parsley');
    expect(card.topNutrient?.name).toBe('magnesium');
    expect(card.discovery).toMatch(/Lebanese|pomegranate|new/);
  });

  it('returns counts for the period', () => {
    const card = buildWeeklyRecap(baseInputs);
    expect(card.cookCount).toBe(5);
    expect(card.cuisineCount).toBeGreaterThan(0);
  });

  it('handles a quiet week (no cooks) gracefully', () => {
    const card = buildWeeklyRecap({
      ...baseInputs,
      cooks: [],
      ingredients: [],
      newCuisinesThisWeek: [],
      newIngredientsThisWeek: [],
    });
    expect(card.cookCount).toBe(0);
    expect(card.topCuisine).toBeNull();
    expect(card.topIngredient).toBeNull();
    expect(card.discovery).toBeNull();
  });
});
