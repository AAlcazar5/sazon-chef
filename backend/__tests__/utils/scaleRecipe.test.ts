// W-A2 — deterministic recipe scaling. The LLM must NEVER compute ingredient
// quantities (office-hours acceptance criterion 1); this pure module owns it.
// Operates on the structured ingredient shape ({ name, amount, unit }) used
// by GeneratedRecipe — free-text RecipeIngredient.text parsing is a separate
// (heuristic) concern, deliberately out of W-A2 scope.

import {
  convertMass,
  scaleIngredients,
  scaleFactorForTarget,
  scaleRecipeToTarget,
  type ScalableIngredient,
} from '../../src/utils/scaleRecipe';

const salmon: ScalableIngredient[] = [
  { name: 'salmon', amount: 20, unit: 'oz' },
  { name: 'soy sauce', amount: 2, unit: 'tbsp' },
];

describe('convertMass (oz↔lb explicitly required)', () => {
  it('converts oz↔lb both directions', () => {
    expect(convertMass(16, 'oz', 'lb')).toBeCloseTo(1, 10);
    expect(convertMass(2, 'lb', 'oz')).toBeCloseTo(32, 10);
  });
  it('passes through identical units', () => {
    expect(convertMass(7, 'oz', 'oz')).toBe(7);
  });
  it('returns null for incompatible / unknown units', () => {
    expect(convertMass(1, 'cup', 'lb')).toBeNull();
    expect(convertMass(1, 'oz', 'tbsp')).toBeNull();
  });
});

describe('scaleIngredients (immutable, exact)', () => {
  it('scales every amount by the factor, preserving name + unit', () => {
    const out = scaleIngredients(salmon, 2);
    expect(out).toEqual([
      { name: 'salmon', amount: 40, unit: 'oz' },
      { name: 'soy sauce', amount: 4, unit: 'tbsp' },
    ]);
  });
  it('factor 1 is a value no-op but returns a new array (no mutation)', () => {
    const out = scaleIngredients(salmon, 1);
    expect(out).toEqual(salmon);
    expect(out).not.toBe(salmon);
    expect(out[0]).not.toBe(salmon[0]);
    expect(salmon[0].amount).toBe(20); // original untouched
  });
  it('handles fractional amounts and factors', () => {
    const out = scaleIngredients(
      [{ name: 'yeast', amount: 0.5, unit: 'tsp' }],
      3,
    );
    expect(out[0].amount).toBeCloseTo(1.5, 10);
    const out2 = scaleIngredients(
      [{ name: 'x', amount: 1.25, unit: 'cup' }],
      1.6,
    );
    expect(out2[0].amount).toBeCloseTo(2, 10);
  });
  it('rejects a non-finite or non-positive factor', () => {
    expect(() => scaleIngredients(salmon, 0)).toThrow();
    expect(() => scaleIngredients(salmon, -1)).toThrow();
    expect(() => scaleIngredients(salmon, Number.NaN)).toThrow();
  });
});

describe('scaleFactorForTarget', () => {
  it('derives the factor with unit conversion (20oz → 2lb = 1.6)', () => {
    expect(
      scaleFactorForTarget(salmon[0], { amount: 2, unit: 'lb' }),
    ).toBeCloseTo(1.6, 10);
  });
  it('same-unit ratio', () => {
    expect(
      scaleFactorForTarget({ name: 'flour', amount: 4, unit: 'cup' }, { amount: 6, unit: 'cup' }),
    ).toBeCloseTo(1.5, 10);
  });
  it('throws on incompatible units (cannot infer cups from lb)', () => {
    expect(() =>
      scaleFactorForTarget({ name: 'flour', amount: 4, unit: 'cup' }, { amount: 1, unit: 'lb' }),
    ).toThrow();
  });
});

describe('scaleRecipeToTarget (end-to-end, the salmon moment)', () => {
  it('scales the whole list off a reference ingredient target', () => {
    const out = scaleRecipeToTarget(salmon, 'salmon', { amount: 2, unit: 'lb' });
    expect(out[0]).toEqual({ name: 'salmon', amount: 32, unit: 'oz' });
    expect(out[1].amount).toBeCloseTo(3.2, 10);
    expect(salmon[0].amount).toBe(20); // immutable
  });
  it('throws when the reference ingredient is not found', () => {
    expect(() =>
      scaleRecipeToTarget(salmon, 'chicken', { amount: 2, unit: 'lb' }),
    ).toThrow(/reference/i);
  });
});
