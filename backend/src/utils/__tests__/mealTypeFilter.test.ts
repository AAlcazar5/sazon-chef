// Sauce scoring guard. Sauces/condiments are a browsable catalog category,
// not a servable meal — a 2-tbsp tzatziki must never enter the generic
// recommendation/plate candidate pool, where the 70/30 macro/taste score
// would treat it as a standalone plate. When the caller explicitly asks for
// a mealType (including 'sauce'), that wins; otherwise sauces are excluded.

import { mealTypeWhereClause } from '../mealTypeFilter';

describe('mealTypeWhereClause', () => {
  it('excludes sauces when no explicit mealType filter is set', () => {
    expect(mealTypeWhereClause(undefined)).toEqual({ not: 'sauce' });
    expect(mealTypeWhereClause('')).toEqual({ not: 'sauce' });
    expect(mealTypeWhereClause('   ')).toEqual({ not: 'sauce' });
  });

  it('passes an explicit meal type through unchanged', () => {
    expect(mealTypeWhereClause('dinner')).toBe('dinner');
    expect(mealTypeWhereClause('snack')).toBe('snack');
    expect(mealTypeWhereClause('dessert')).toBe('dessert');
  });

  it('lets an explicit sauce filter surface sauces (browsable category)', () => {
    expect(mealTypeWhereClause('sauce')).toBe('sauce');
  });
});
