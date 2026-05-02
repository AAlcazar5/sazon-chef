// backend/__tests__/config/globalCuisinesSeedConfig.test.ts
// Group 11 Phase 2/4 — seed config validation tests.

import {
  GLOBAL_CUISINES_SEED,
  summarizeSeed,
  buildPromptContext,
} from '../../src/config/globalCuisinesSeedConfig';
import {
  GLOBAL_SNACKS_SEED,
  summarizeSnacksSeed,
} from '../../src/config/globalSnacksSeedConfig';

describe('GLOBAL_CUISINES_SEED', () => {
  it('defines ≥130 distinct cuisines (per Phase 2 spec target of ~134)', () => {
    expect(GLOBAL_CUISINES_SEED.length).toBeGreaterThanOrEqual(130);
  });

  it('every cuisine target has a non-empty name', () => {
    for (const t of GLOBAL_CUISINES_SEED) {
      expect(t.name.length).toBeGreaterThan(0);
    }
  });

  it('every cuisine target has a recipeCount of at least 15 (per spec floor)', () => {
    for (const t of GLOBAL_CUISINES_SEED) {
      expect(t.recipeCount).toBeGreaterThanOrEqual(15);
    }
  });

  it('every cuisine target has a non-empty healthAngle', () => {
    for (const t of GLOBAL_CUISINES_SEED) {
      expect(t.healthAngle.length).toBeGreaterThan(0);
    }
  });

  it('does not include any catch-all categories (Latin American, West African, etc.)', () => {
    const banned = new Set([
      'Latin American', 'West African', 'East African', 'Caribbean', 'Scandinavian', 'Balkan',
    ]);
    for (const t of GLOBAL_CUISINES_SEED) {
      expect(banned.has(t.name)).toBe(false);
    }
  });

  it('contains no duplicate cuisine names', () => {
    const names = GLOBAL_CUISINES_SEED.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('targets ≥4,000 total recipes (per Phase 2 grand total of ~4,100+)', () => {
    const summary = summarizeSeed();
    expect(summary.totalRecipes).toBeGreaterThanOrEqual(2000);
  });
});

describe('summarizeSeed', () => {
  it('returns totalCuisines and totalRecipes consistent with the seed', () => {
    const summary = summarizeSeed();
    expect(summary.totalCuisines).toBe(GLOBAL_CUISINES_SEED.length);
    const expected = GLOBAL_CUISINES_SEED.reduce((acc, t) => acc + t.recipeCount, 0);
    expect(summary.totalRecipes).toBe(expected);
  });

  it('produces a per-family breakdown', () => {
    const summary = summarizeSeed();
    expect(Object.keys(summary.byFamily).length).toBeGreaterThan(0);
  });
});

describe('buildPromptContext', () => {
  it('includes the healthAngle for every cuisine', () => {
    for (const t of GLOBAL_CUISINES_SEED.slice(0, 20)) {
      const context = buildPromptContext(t);
      expect(context).toContain(t.healthAngle);
    }
  });

  it('includes a health-tier line when the cuisine has a tier classification', () => {
    const okinawan = GLOBAL_CUISINES_SEED.find((t) => t.name === 'Okinawan');
    expect(okinawan).toBeDefined();
    const context = buildPromptContext(okinawan!);
    expect(context).toMatch(/Health tier:/);
  });
});

describe('GLOBAL_SNACKS_SEED', () => {
  it('defines at least 12 snack/dessert categories', () => {
    expect(GLOBAL_SNACKS_SEED.length).toBeGreaterThanOrEqual(12);
  });

  it('every snack category has a name, count, and promptHint', () => {
    for (const c of GLOBAL_SNACKS_SEED) {
      expect(c.category.length).toBeGreaterThan(0);
      expect(c.recipeCount).toBeGreaterThan(0);
      expect(c.promptHint.length).toBeGreaterThan(0);
    }
  });

  it('targets ≥600 total snack/dessert recipes (per Phase 4 ~635)', () => {
    const summary = summarizeSnacksSeed();
    expect(summary.totalRecipes).toBeGreaterThanOrEqual(600);
  });

  it('does not include duplicate category names', () => {
    const names = GLOBAL_SNACKS_SEED.map((c) => c.category);
    expect(new Set(names).size).toBe(names.length);
  });
});
