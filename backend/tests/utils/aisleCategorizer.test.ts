// backend/tests/utils/aisleCategorizer.test.ts
// TDD: Task 3 — aisle categorizer mirrors frontend logic

import { categorizeItem, AISLE_ORDER, DEFAULT_AISLE_ORDER } from '../../src/utils/aisleCategorizer';

describe('categorizeItem', () => {
  it('categorizes apple as Produce', () => {
    expect(categorizeItem('apple')).toBe('Produce');
  });

  it('categorizes spinach as Produce', () => {
    expect(categorizeItem('fresh spinach')).toBe('Produce');
  });

  it('categorizes chicken as Meat & Seafood', () => {
    expect(categorizeItem('chicken breast')).toBe('Meat & Seafood');
  });

  it('categorizes salmon as Meat & Seafood', () => {
    expect(categorizeItem('salmon fillet')).toBe('Meat & Seafood');
  });

  it('categorizes milk as Dairy', () => {
    expect(categorizeItem('whole milk')).toBe('Dairy');
  });

  it('categorizes mozzarella as Dairy', () => {
    expect(categorizeItem('mozzarella cheese')).toBe('Dairy');
  });

  it('categorizes bread as Bakery', () => {
    expect(categorizeItem('sourdough bread')).toBe('Bakery');
  });

  it('categorizes rice as Pantry', () => {
    expect(categorizeItem('jasmine rice')).toBe('Pantry');
  });

  it('categorizes pasta as Pantry', () => {
    expect(categorizeItem('penne pasta')).toBe('Pantry');
  });

  it('categorizes orange juice as Beverages', () => {
    expect(categorizeItem('orange juice')).toBe('Beverages');
  });

  it('categorizes ice cream as Frozen', () => {
    expect(categorizeItem('ice cream')).toBe('Frozen');
  });

  it('categorizes chips as Snacks', () => {
    expect(categorizeItem('tortilla chips')).toBe('Snacks');
  });

  it('returns undefined for unknown ingredient', () => {
    expect(categorizeItem('zzz_unknown_ingredient_xyz')).toBeUndefined();
  });

  it('is case-insensitive', () => {
    expect(categorizeItem('CHICKEN BREAST')).toBe('Meat & Seafood');
    expect(categorizeItem('Spinach')).toBe('Produce');
  });

  it('handles empty string gracefully', () => {
    expect(categorizeItem('')).toBeUndefined();
  });

  it('prioritizes Frozen over Produce for frozen vegetables', () => {
    expect(categorizeItem('frozen spinach')).toBe('Frozen');
  });
});

describe('AISLE_ORDER', () => {
  it('Produce comes before Meat & Seafood', () => {
    expect(AISLE_ORDER['Produce']).toBeLessThan(AISLE_ORDER['Meat & Seafood']);
  });

  it('Pantry comes after Dairy', () => {
    expect(AISLE_ORDER['Pantry']).toBeGreaterThan(AISLE_ORDER['Dairy']);
  });

  it('all defined categories have numeric order values', () => {
    Object.values(AISLE_ORDER).forEach(v => {
      expect(typeof v).toBe('number');
    });
  });

  it('DEFAULT_AISLE_ORDER is greater than any defined category order', () => {
    const maxOrder = Math.max(...Object.values(AISLE_ORDER));
    expect(DEFAULT_AISLE_ORDER).toBeGreaterThan(maxOrder);
  });
});
