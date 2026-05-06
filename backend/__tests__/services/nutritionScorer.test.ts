// backend/__tests__/services/nutritionScorer.test.ts
// ROADMAP 4.0 Tier D2.3 — Nutrition completeness scorer.

import { scoreNutrition } from '../../src/services/nutritionScorer';

const balanced = {
  macros: { calories: 480, protein: 38, carbs: 42, fat: 18, fiber: 8 },
  micros: {
    iron: 4,
    calcium: 120,
    magnesium: 80,
    potassium: 850,
    vitaminC: 35,
    folate: 60,
    zinc: 5,
  },
  ingredientNames: ['chicken thigh', 'lemon', 'olive oil', 'garlic'],
};

describe('scoreNutrition', () => {
  it('returns 5 for full macro + ≥5 micro coverage with sane bounds', () => {
    const r = scoreNutrition(balanced);
    expect(r.score).toBe(5);
    expect(r.reasons).toEqual([]);
  });

  it('penalizes any macro at or below zero', () => {
    const r = scoreNutrition({
      ...balanced,
      macros: { ...balanced.macros, protein: 0 },
    });
    expect(r.reasons.some((x) => x.code === 'macro_missing' && x.detail === 'protein')).toBe(true);
  });

  it('penalizes fewer than 5 populated micronutrients', () => {
    const r = scoreNutrition({
      ...balanced,
      micros: { iron: 4, calcium: 120 },
    });
    expect(r.reasons.some((x) => x.code === 'micros_thin')).toBe(true);
    expect(r.score).toBeLessThan(5);
  });

  it('flags implausible protein content (50g+ protein with no protein source)', () => {
    const r = scoreNutrition({
      ...balanced,
      macros: { ...balanced.macros, protein: 55 },
      ingredientNames: ['lettuce', 'tomato', 'cucumber', 'olive oil', 'lemon'],
    });
    expect(r.reasons.some((x) => x.code === 'nutrition_implausible')).toBe(true);
  });

  it('does not flag implausible when protein source is present', () => {
    const r = scoreNutrition({
      ...balanced,
      macros: { ...balanced.macros, protein: 55 },
      ingredientNames: ['chicken breast', 'lettuce', 'tomato', 'olive oil', 'lemon'],
    });
    expect(r.reasons.some((x) => x.code === 'nutrition_implausible')).toBe(false);
  });

  it('penalizes missing aggregate (treated as no data)', () => {
    const r = scoreNutrition({
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      micros: {},
      ingredientNames: balanced.ingredientNames,
    });
    expect(r.score).toBe(0);
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it('counts only positive micro values (zero/null does not count)', () => {
    const r = scoreNutrition({
      ...balanced,
      micros: { iron: 4, calcium: 0, magnesium: 80, potassium: 850, vitaminC: 0, folate: 0, zinc: 0 },
    });
    // Only 3 populated micros → micros_thin
    expect(r.reasons.some((x) => x.code === 'micros_thin')).toBe(true);
  });
});
