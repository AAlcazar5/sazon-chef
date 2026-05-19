// Tier Y-1a — persisted structured-ingredient seam. Two pure halves:
//  - buildIngredientRow: AI-gen structured {name,amount,unit} also persists
//    structured columns (not just the flattened `text`)
//  - toScalableIngredients: prefers persisted structure; legacy/text-only
//    rows fall back to the existing parseIngredientQuantity; unparseable
//    rows are OMITTED, never fabricated (W-A2 invariant). RED-first.

import {
  buildIngredientRow,
  toScalableIngredients,
} from '../../src/utils/structuredIngredients';

describe('buildIngredientRow', () => {
  it('structured object → persists text + name/amount/unit', () => {
    expect(buildIngredientRow({ name: 'salmon', amount: 1, unit: 'lb' }, 0)).toEqual({
      text: '1 lb salmon',
      order: 1,
      name: 'salmon',
      amount: 1,
      unit: 'lb',
    });
  });

  it('plain string → text only, no structured columns (legacy)', () => {
    expect(buildIngredientRow('2 cups flour', 1)).toEqual({
      text: '2 cups flour',
      order: 2,
    });
  });

  it('{text} object → text only (already-flattened)', () => {
    expect(buildIngredientRow({ text: '3 eggs' }, 2)).toEqual({
      text: '3 eggs',
      order: 3,
    });
  });

  it('zero/empty amount or unit → no structured columns (not fabricated)', () => {
    expect(buildIngredientRow({ name: 'salt', amount: 0, unit: '' }, 0)).toEqual({
      text: 'salt',
      order: 1,
    });
  });
});

describe('toScalableIngredients', () => {
  it('prefers persisted structured columns', () => {
    const rows = [
      { text: '1 lb salmon', name: 'salmon', amount: 1, unit: 'lb' },
      { text: '2 tablespoons soy sauce', name: 'soy sauce', amount: 2, unit: 'tablespoons' },
    ];
    expect(toScalableIngredients(rows)).toEqual([
      { name: 'salmon', amount: 1, unit: 'lb' },
      { name: 'soy sauce', amount: 2, unit: 'tablespoons' },
    ]);
  });

  it('legacy text-only row falls back to parseIngredientQuantity', () => {
    const out = toScalableIngredients([
      { text: '2 cups flour', name: null, amount: null, unit: null },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(2);
    expect(out[0].unit).toBeTruthy();
  });

  it('unparseable legacy row is OMITTED, never fabricated', () => {
    const out = toScalableIngredients([
      { text: 'salt to taste', name: null, amount: null, unit: null },
      { text: '1 lb salmon', name: 'salmon', amount: 1, unit: 'lb' },
    ]);
    // the unparseable one is dropped; the structured one survives
    expect(out).toEqual([{ name: 'salmon', amount: 1, unit: 'lb' }]);
  });

  it('empty list → []', () => {
    expect(toScalableIngredients([])).toEqual([]);
  });
});
