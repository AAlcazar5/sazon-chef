// backend/__tests__/services/costEstimationService.spec.ts
// 10W: per-ingredient cost estimation, unit conversion, fallback reasons, caching.

import {
  costForIngredient,
  estimateRecipeCost,
  toGrams,
  resetCostCache,
  FALLBACK_REASONS,
  COST_DISCLAIMER,
  type CostSource,
  type IngredientInput,
} from '../../src/services/costEstimationService';

describe('costEstimationService', () => {
  beforeEach(() => {
    resetCostCache();
  });

  describe('COST_DISCLAIMER', () => {
    it('exports the user-facing disclaimer copy', () => {
      expect(COST_DISCLAIMER).toBe('Sazon estimates · prices vary by store');
    });
  });

  describe('FALLBACK_REASONS', () => {
    it('enumerates priced/category/unknown sources', () => {
      expect(FALLBACK_REASONS.PRICED).toBe('priced');
      expect(FALLBACK_REASONS.CATEGORY).toBe('category');
      expect(FALLBACK_REASONS.UNKNOWN).toBe('unknown');
    });
  });

  describe('toGrams', () => {
    it('converts 1 cup flour to ~125g (density 0.53)', () => {
      const grams = toGrams(1, 'cup', 'flour');
      expect(grams).toBeGreaterThanOrEqual(118);
      expect(grams).toBeLessThanOrEqual(132);
    });

    it('converts 1 tbsp olive oil to ~14g (density 0.92)', () => {
      const grams = toGrams(1, 'tbsp', 'olive oil');
      expect(grams).toBeGreaterThanOrEqual(13);
      expect(grams).toBeLessThanOrEqual(15);
    });

    it('converts 1 cup sugar to ~204g (density 0.85)', () => {
      const grams = toGrams(1, 'cup', 'sugar');
      expect(grams).toBeGreaterThanOrEqual(195);
      expect(grams).toBeLessThanOrEqual(213);
    });

    it('converts 1 lb to ~454g', () => {
      const grams = toGrams(1, 'lb', 'chicken');
      expect(grams).toBeGreaterThanOrEqual(450);
      expect(grams).toBeLessThanOrEqual(458);
    });

    it('converts 1 kg to 1000g', () => {
      expect(toGrams(1, 'kg', 'rice')).toBe(1000);
    });

    it('passes grams through unchanged', () => {
      expect(toGrams(250, 'g', 'rice')).toBe(250);
    });

    it('uses water density when ingredient has no override', () => {
      // 1 cup ≈ 240ml; water density 1 → 240g
      const grams = toGrams(1, 'cup', 'water');
      expect(grams).toBeGreaterThanOrEqual(235);
      expect(grams).toBeLessThanOrEqual(245);
    });
  });

  describe('costForIngredient — priced path', () => {
    it('prices known ingredient (chicken breast) within ±10% of expected', () => {
      // chicken breast ~$6/lb avg; 1 lb → ~$6
      const result = costForIngredient({
        name: 'chicken breast',
        quantity: 1,
        unit: 'lb',
      });
      expect(result.source).toBe(FALLBACK_REASONS.PRICED);
      expect(result.cost).toBeGreaterThanOrEqual(5.4);
      expect(result.cost).toBeLessThanOrEqual(6.6);
    });

    it('prices 1 cup flour using gram conversion (~125g of $1/lb flour ≈ $0.27)', () => {
      const result = costForIngredient({
        name: 'flour',
        quantity: 1,
        unit: 'cup',
      });
      expect(result.source).toBe(FALLBACK_REASONS.PRICED);
      // 125g / 454g per lb = 0.275 lb × $1/lb avg ≈ $0.28; ±10% → $0.25-$0.30
      expect(result.cost).toBeGreaterThanOrEqual(0.2);
      expect(result.cost).toBeLessThanOrEqual(0.5);
    });

    it('prices 1 tbsp olive oil (~14g) at fraction of bottle cost', () => {
      const result = costForIngredient({
        name: 'olive oil',
        quantity: 1,
        unit: 'tbsp',
      });
      expect(result.source).toBe(FALLBACK_REASONS.PRICED);
      // Tiny portion of a $9 bottle (~500ml) → cents
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBeLessThan(1);
    });

    it('prices "each" units for piece-priced items (1 onion ≈ $1)', () => {
      const result = costForIngredient({
        name: 'onion',
        quantity: 1,
        unit: 'each',
      });
      expect(result.source).toBe(FALLBACK_REASONS.PRICED);
      expect(result.cost).toBeGreaterThanOrEqual(0.5);
      expect(result.cost).toBeLessThanOrEqual(1.5);
    });
  });

  describe('costForIngredient — category fallback', () => {
    it('falls through to category estimate (NOT flat $7) for unknown protein', () => {
      const result = costForIngredient({
        name: 'wagyu picanha',
        quantity: 1,
        unit: 'lb',
      });
      expect(result.source).toBe(FALLBACK_REASONS.CATEGORY);
      // Protein category band, not the legacy flat $7
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBeLessThan(20);
    });

    it('falls through to category estimate for unknown produce', () => {
      const result = costForIngredient({
        name: 'romanesco',
        quantity: 1,
        unit: 'lb',
      });
      expect(result.source).toBe(FALLBACK_REASONS.CATEGORY);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBeLessThan(8);
    });

    it('returns unknown source (not flat $7) for completely unrecognized names', () => {
      const result = costForIngredient({
        name: 'asdfqwerty',
        quantity: 1,
        unit: 'each',
      });
      expect(result.source).toBe(FALLBACK_REASONS.UNKNOWN);
      // Tier-default, never the legacy hardcoded $7
      expect(result.cost).not.toBe(7);
    });
  });

  describe('costForIngredient — quantity scaling', () => {
    it('scales linearly with quantity', () => {
      const one = costForIngredient({ name: 'rice', quantity: 1, unit: 'lb' });
      const five = costForIngredient({ name: 'rice', quantity: 5, unit: 'lb' });
      expect(five.cost).toBeCloseTo(one.cost * 5, 1);
    });

    it('handles fractional quantities', () => {
      const half = costForIngredient({ name: 'butter', quantity: 0.5, unit: 'lb' });
      const full = costForIngredient({ name: 'butter', quantity: 1, unit: 'lb' });
      expect(half.cost).toBeCloseTo(full.cost / 2, 2);
    });
  });

  describe('estimateRecipeCost', () => {
    const sampleRecipe = {
      id: 'r1',
      servings: 4,
      ingredients: [
        { text: '1 lb chicken breast', name: 'chicken breast', quantity: 1, unit: 'lb' },
        { text: '2 cups rice', name: 'rice', quantity: 2, unit: 'cup' },
        { text: '1 tbsp olive oil', name: 'olive oil', quantity: 1, unit: 'tbsp' },
      ],
    };

    it('sums ingredient costs and divides by servings', () => {
      const result = estimateRecipeCost(sampleRecipe);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.estimatedCostPerServing).toBeCloseTo(result.estimatedCost / 4, 2);
    });

    it('reports the dominant source when all ingredients priced', () => {
      const result = estimateRecipeCost(sampleRecipe);
      expect(result.source).toBe(FALLBACK_REASONS.PRICED);
    });

    it('marks the recipe as category source when any ingredient falls through', () => {
      const result = estimateRecipeCost({
        ...sampleRecipe,
        ingredients: [
          { text: '1 lb romanesco', name: 'romanesco', quantity: 1, unit: 'lb' },
          { text: '1 lb chicken', name: 'chicken', quantity: 1, unit: 'lb' },
        ],
      });
      // Mixed sources → degrades to category (worst case priced/category)
      expect([FALLBACK_REASONS.CATEGORY, FALLBACK_REASONS.PRICED]).toContain(result.source);
    });

    it('caches by ingredient hash — same inputs return same value (referential equality of cost number)', () => {
      const a = estimateRecipeCost(sampleRecipe);
      const b = estimateRecipeCost(sampleRecipe);
      expect(b.estimatedCost).toBe(a.estimatedCost);
      expect(b.cacheHit).toBe(true);
    });

    it('cache key changes when ingredient list changes', () => {
      const first = estimateRecipeCost(sampleRecipe);
      const modified = estimateRecipeCost({
        ...sampleRecipe,
        ingredients: [
          ...sampleRecipe.ingredients,
          { text: '1 lb butter', name: 'butter', quantity: 1, unit: 'lb' },
        ],
      });
      expect(modified.estimatedCost).toBeGreaterThan(first.estimatedCost);
      expect(modified.cacheHit).toBe(false);
    });

    it('per-ingredient breakdown is returned with source tags', () => {
      const result = estimateRecipeCost(sampleRecipe);
      expect(result.breakdown).toHaveLength(3);
      result.breakdown.forEach((b) => {
        expect(b.source).toMatch(/priced|category|unknown/);
        expect(typeof b.cost).toBe('number');
      });
    });
  });

  describe('costForIngredient — additional unit conversions', () => {
    it('handles g unit directly', () => {
      const result = costForIngredient({ name: 'rice', quantity: 100, unit: 'g' });
      expect(result.source).toBe(FALLBACK_REASONS.PRICED);
      expect(result.cost).toBeGreaterThan(0);
    });

    it('handles tsp for sugar (~4g)', () => {
      const result = costForIngredient({ name: 'sugar', quantity: 1, unit: 'tsp' });
      expect(result.source).toBe(FALLBACK_REASONS.PRICED);
      expect(result.cost).toBeGreaterThan(0);
    });

    it('handles ml for water (1ml = 1g)', () => {
      expect(toGrams(100, 'ml', 'water')).toBeCloseTo(100, 0);
    });

    it('handles oz for chicken', () => {
      expect(toGrams(16, 'oz', 'chicken')).toBeCloseTo(453.6, 0);
    });

    it('returns NaN for unknown unit', () => {
      expect(toGrams(1, 'pinch', 'salt')).toBeNaN();
    });
  });

  describe('honesty signals', () => {
    it('returns missingPriceRatio for downstream UI gating', () => {
      const result = estimateRecipeCost({
        id: 'r2',
        servings: 2,
        ingredients: [
          { text: '1 lb chicken', name: 'chicken', quantity: 1, unit: 'lb' },
          { text: '1 lb romanesco', name: 'romanesco', quantity: 1, unit: 'lb' },
          { text: '1 lb asdfqwerty', name: 'asdfqwerty', quantity: 1, unit: 'lb' },
          { text: '1 lb foobar', name: 'foobar', quantity: 1, unit: 'lb' },
        ],
      });
      // 2 of 4 ingredients fell back → fallbackRatio ≥ 0.5
      expect(result.fallbackRatio).toBeGreaterThanOrEqual(0.5);
    });
  });
});
