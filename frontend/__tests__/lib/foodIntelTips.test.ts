// Group 10R: Tip library integrity test.
// Verifies the curated tip database meets minimum thresholds and shape contracts.

import {
  FOOD_INTEL_TIPS,
  type FoodIntelTip,
  type FoodIntelCategory,
} from '../../lib/foodIntelTips';

const CATEGORIES: FoodIntelCategory[] = [
  'superfood',
  'nutrient',
  'technique',
  'myth_bust',
  'pairing',
];

describe('foodIntelTips library', () => {
  it('ships at least 80 tips', () => {
    expect(FOOD_INTEL_TIPS.length).toBeGreaterThanOrEqual(80);
  });

  it('every tip has a non-empty title and body', () => {
    for (const tip of FOOD_INTEL_TIPS) {
      expect(tip.title.trim().length).toBeGreaterThan(0);
      expect(tip.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('every tip title is at most 8 words', () => {
    for (const tip of FOOD_INTEL_TIPS) {
      const words = tip.title.trim().split(/\s+/);
      expect(words.length).toBeLessThanOrEqual(8);
    }
  });

  it('every tip body is at most 30 words', () => {
    for (const tip of FOOD_INTEL_TIPS) {
      const words = tip.body.trim().split(/\s+/);
      expect(words.length).toBeLessThanOrEqual(30);
    }
  });

  it('has no duplicate IDs', () => {
    const ids = FOOD_INTEL_TIPS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every category has at least 8 tips', () => {
    for (const cat of CATEGORIES) {
      const count = FOOD_INTEL_TIPS.filter((t) => t.category === cat).length;
      expect(count).toBeGreaterThanOrEqual(8);
    }
  });

  it('every tip has a recognized category', () => {
    for (const tip of FOOD_INTEL_TIPS) {
      expect(CATEGORIES).toContain(tip.category);
    }
  });

  it('all trigger keywords are lowercase + trimmed', () => {
    for (const tip of FOOD_INTEL_TIPS) {
      expect(tip.trigger).toBe(tip.trigger.trim().toLowerCase());
      for (const tag of tip.tags) {
        expect(tag).toBe(tag.trim().toLowerCase());
      }
    }
  });

  it('every tip declares personalizationKeys with all four dimensions', () => {
    for (const tip of FOOD_INTEL_TIPS) {
      expect(tip.personalizationKeys).toBeDefined();
      expect(Array.isArray(tip.personalizationKeys.cuisine)).toBe(true);
      expect(Array.isArray(tip.personalizationKeys.nutrient)).toBe(true);
      expect(Array.isArray(tip.personalizationKeys.skillTier)).toBe(true);
      expect(Array.isArray(tip.personalizationKeys.goalPhase)).toBe(true);
    }
  });

  it('personalizationKeys values are normalized (lowercase, trimmed)', () => {
    for (const tip of FOOD_INTEL_TIPS) {
      for (const c of tip.personalizationKeys.cuisine) {
        expect(c).toBe(c.trim().toLowerCase());
      }
      for (const n of tip.personalizationKeys.nutrient) {
        expect(n).toBe(n.trim().toLowerCase());
      }
    }
  });
});

describe('FoodIntelTip shape', () => {
  it('exports the expected types', () => {
    const sample: FoodIntelTip = FOOD_INTEL_TIPS[0];
    expect(sample.id).toBeDefined();
    expect(sample.category).toBeDefined();
    expect(sample.trigger).toBeDefined();
    expect(sample.title).toBeDefined();
    expect(sample.body).toBeDefined();
    expect(sample.tags).toBeDefined();
    expect(sample.personalizationKeys).toBeDefined();
  });
});
