// Sauce calorie-range carve-out. The meal-centric floor (10 kcal/serving)
// rejected legitimate condiments — a tablespoon of herb sauce reads 0-8
// kcal/serving — failing 104/304 generations in the first sauce seed run.
// Sauces are a flavor accompaniment, not a plate, so the lower bound is
// dropped for them; the upper bound + finiteness guard still apply.

import { assertCaloriesPerServing } from '../calorieRange';

describe('assertCaloriesPerServing', () => {
  it('enforces the 10–2500 window for normal meal types', () => {
    expect(() => assertCaloriesPerServing(8, 'dinner')).toThrow(/outside reasonable range/);
    expect(() => assertCaloriesPerServing(9, 'snack')).toThrow(/10-2500/);
    expect(() => assertCaloriesPerServing(2501, 'dessert')).toThrow(/outside reasonable range/);
    expect(() => assertCaloriesPerServing(8, undefined)).toThrow(/outside reasonable range/);
  });

  it('accepts in-range values for normal meal types', () => {
    expect(() => assertCaloriesPerServing(10, 'dinner')).not.toThrow();
    expect(() => assertCaloriesPerServing(650, 'lunch')).not.toThrow();
    expect(() => assertCaloriesPerServing(2500, 'dessert')).not.toThrow();
  });

  it('drops the lower bound for sauces (low-calorie condiments are valid)', () => {
    expect(() => assertCaloriesPerServing(0, 'sauce')).not.toThrow();
    expect(() => assertCaloriesPerServing(8, 'sauce')).not.toThrow();
    expect(() => assertCaloriesPerServing(120, 'sauce')).not.toThrow();
  });

  it('still rejects an absurd upper value and non-finite/negative input for sauces', () => {
    expect(() => assertCaloriesPerServing(2501, 'sauce')).toThrow(/outside reasonable range/);
    expect(() => assertCaloriesPerServing(-5, 'sauce')).toThrow(/outside reasonable range/);
    expect(() => assertCaloriesPerServing(Number.NaN, 'sauce')).toThrow(/outside reasonable range/);
  });
});
