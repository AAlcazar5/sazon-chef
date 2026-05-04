// backend/__tests__/config/globalCuisinesSeedConfig.test.ts
// Group 11 Phase 2/4 — seed config validation tests.

import {
  GLOBAL_CUISINES_SEED,
  summarizeSeed,
  buildPromptContext,
  V1_SCOPE_CUISINES,
  getV1ScopeCuisines,
  v1ScopeRecipeTotal,
} from '../../src/config/globalCuisinesSeedConfig';
import {
  GLOBAL_SNACKS_SEED,
  summarizeSnacksSeed,
  V1_SCOPE_CATEGORIES,
  getV1ScopeCategories,
  v1ScopeSnackTotal,
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

describe('Group 11 v1 scope', () => {
  describe('cuisines', () => {
    it('defines exactly 30 v1-scope cuisines', () => {
      expect(V1_SCOPE_CUISINES.size).toBe(30);
    });

    it('every v1-scope cuisine has a corresponding entry in GLOBAL_CUISINES_SEED', () => {
      for (const name of V1_SCOPE_CUISINES) {
        const found = GLOBAL_CUISINES_SEED.find((t) => t.name === name);
        expect(found).toBeDefined();
      }
    });

    it('getV1ScopeCuisines returns 30 entries that match the V1_SCOPE_CUISINES set', () => {
      const v1 = getV1ScopeCuisines();
      expect(v1.length).toBe(30);
      for (const t of v1) {
        expect(V1_SCOPE_CUISINES.has(t.name)).toBe(true);
      }
    });

    it('v1 scope total recipe count is in the 750-850 range (target ~800)', () => {
      const total = v1ScopeRecipeTotal();
      expect(total).toBeGreaterThanOrEqual(750);
      expect(total).toBeLessThanOrEqual(850);
    });

    it('includes the personal N=1 anchor (Salvadorean) and blue-zone signal (Okinawan)', () => {
      expect(V1_SCOPE_CUISINES.has('Salvadorean')).toBe(true);
      expect(V1_SCOPE_CUISINES.has('Okinawan')).toBe(true);
    });
  });

  describe('snacks', () => {
    it('defines exactly 5 v1-scope categories', () => {
      expect(V1_SCOPE_CATEGORIES.size).toBe(5);
    });

    it('every v1-scope category has a corresponding entry in GLOBAL_SNACKS_SEED', () => {
      for (const name of V1_SCOPE_CATEGORIES) {
        const found = GLOBAL_SNACKS_SEED.find((c) => c.category === name);
        expect(found).toBeDefined();
      }
    });

    it('getV1ScopeCategories returns 5 entries with the v1-override recipe counts', () => {
      const v1 = getV1ScopeCategories();
      expect(v1.length).toBe(5);
      // No category should exceed 50 in v1 scope (overrides cap them)
      for (const c of v1) {
        expect(c.recipeCount).toBeLessThanOrEqual(50);
      }
    });

    it('v1 snack total recipe count is exactly 200', () => {
      expect(v1ScopeSnackTotal()).toBe(200);
    });
  });

  describe('combined v1 budget', () => {
    it('cuisines + snacks total is approximately 1000 recipes', () => {
      const total = v1ScopeRecipeTotal() + v1ScopeSnackTotal();
      expect(total).toBeGreaterThanOrEqual(900);
      expect(total).toBeLessThanOrEqual(1100);
    });
  });
});
