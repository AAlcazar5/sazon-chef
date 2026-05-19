// Tier Y-5 — change-units toggle (screenshot #4: As written / US / Metric).
// Pure conversion over the structured ingredient list. Factor table
// mirrors VisualIngredientList (canonical in-repo numbers). RED-first.

import { convertIngredientUnits } from '../../../lib/cooking/convertIngredientUnits';

const ING = [
  { name: 'flour', amount: 2, unit: 'cups' },
  { name: 'beef', amount: 1, unit: 'lb' },
  { name: 'garlic', amount: 3, unit: 'cloves' }, // unconvertible
];

describe('convertIngredientUnits', () => {
  it('"as-written" is an identity (values unchanged)', () => {
    expect(convertIngredientUnits(ING, 'as-written')).toEqual(ING);
  });

  it('"metric" converts US units; unconvertible pass through', () => {
    expect(convertIngredientUnits(ING, 'metric')).toEqual([
      { name: 'flour', amount: 480, unit: 'ml' },
      { name: 'beef', amount: 453.6, unit: 'g' },
      { name: 'garlic', amount: 3, unit: 'cloves' }, // untouched
    ]);
  });

  it('"us" converts metric units back', () => {
    expect(
      convertIngredientUnits(
        [
          { name: 'milk', amount: 240, unit: 'ml' },
          { name: 'butter', amount: 453.6, unit: 'g' },
        ],
        'us',
      ),
    ).toEqual([
      { name: 'milk', amount: 1, unit: 'cup' },
      { name: 'butter', amount: 16, unit: 'oz' },
    ]);
  });

  it('does not double-convert a unit already in the target system', () => {
    // cups is already US → "us" mode leaves it alone
    expect(convertIngredientUnits([{ name: 'x', amount: 2, unit: 'cups' }], 'us')).toEqual(
      [{ name: 'x', amount: 2, unit: 'cups' }],
    );
  });

  it('rounds to 1 decimal', () => {
    expect(
      convertIngredientUnits([{ name: 'oil', amount: 0.5, unit: 'tsp' }], 'metric'),
    ).toEqual([{ name: 'oil', amount: 2.5, unit: 'ml' }]);
  });
});
