// backend/tests/modules/shoppingListMerge.test.ts
// TDD: Unit Conversion + Smart Ingredient Merge

import { normalizeToCanonical, type CanonicalResult } from '../../src/utils/unitConversion';
import { aggregateQuantitiesSmart } from '../../src/utils/ingredientQuantityParser';
import type { ParsedQuantity } from '../../src/utils/ingredientQuantityParser';

// ---------------------------------------------------------------------------
// normalizeToCanonical — unit conversion table
// ---------------------------------------------------------------------------

describe('normalizeToCanonical', () => {
  // Volume → ml
  test('tsp → ml ×4.93', () => {
    const r = normalizeToCanonical(1, 'tsp');
    expect(r.canonicalUnit).toBe('ml');
    expect(r.amount).toBeCloseTo(4.93, 1);
  });

  test('tbsp → ml ×14.79', () => {
    const r = normalizeToCanonical(1, 'tbsp');
    expect(r.canonicalUnit).toBe('ml');
    expect(r.amount).toBeCloseTo(14.79, 1);
  });

  test('cup → ml ×236.59', () => {
    const r = normalizeToCanonical(1, 'cup');
    expect(r.canonicalUnit).toBe('ml');
    expect(r.amount).toBeCloseTo(236.59, 1);
  });

  test('2 cups → 473.18 ml', () => {
    const r = normalizeToCanonical(2, 'cup');
    expect(r.canonicalUnit).toBe('ml');
    expect(r.amount).toBeCloseTo(473.18, 1);
  });

  // Weight → g
  test('oz → g ×28.35', () => {
    const r = normalizeToCanonical(1, 'oz');
    expect(r.canonicalUnit).toBe('g');
    expect(r.amount).toBeCloseTo(28.35, 1);
  });

  test('lb → g ×453.59', () => {
    const r = normalizeToCanonical(1, 'lb');
    expect(r.canonicalUnit).toBe('g');
    expect(r.amount).toBeCloseTo(453.59, 1);
  });

  // Pass-throughs
  test('ml passes through', () => {
    const r = normalizeToCanonical(250, 'ml');
    expect(r.canonicalUnit).toBe('ml');
    expect(r.amount).toBe(250);
  });

  test('g passes through', () => {
    const r = normalizeToCanonical(100, 'g');
    expect(r.canonicalUnit).toBe('g');
    expect(r.amount).toBe(100);
  });

  test('count passes through', () => {
    const r = normalizeToCanonical(3, 'count');
    expect(r.canonicalUnit).toBe('count');
    expect(r.amount).toBe(3);
  });

  // Unknown unit falls through
  test('unknown unit falls through unchanged', () => {
    const r = normalizeToCanonical(2, 'pinch');
    expect(r.canonicalUnit).toBe('pinch');
    expect(r.amount).toBe(2);
  });

  test('empty unit falls through unchanged', () => {
    const r = normalizeToCanonical(1, '');
    expect(r.canonicalUnit).toBe('');
    expect(r.amount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// aggregateQuantitiesSmart — merge by (normalizedName, canonicalUnit)
// ---------------------------------------------------------------------------

describe('aggregateQuantitiesSmart', () => {
  // Same volume unit
  test('merges two cups of the same ingredient', () => {
    const quantities: ParsedQuantity[] = [
      { amount: 1, unit: 'cup', originalText: '1 cup flour' },
      { amount: 0.5, unit: 'cup', originalText: '1/2 cup flour' },
    ];
    const result = aggregateQuantitiesSmart('flour', quantities);
    expect(result.totalAmount).toBeCloseTo(1.5, 2);
    expect(result.totalUnit).toBe('cup');
  });

  // Cross-unit volume merge: tsp + tbsp → merge in ml then back to dominant unit
  test('merges tsp and tbsp by converting through ml', () => {
    const quantities: ParsedQuantity[] = [
      { amount: 3, unit: 'tsp', originalText: '3 tsp salt' },
      { amount: 1, unit: 'tbsp', originalText: '1 tbsp salt' },
    ];
    const result = aggregateQuantitiesSmart('salt', quantities);
    // 3 tsp = 14.79 ml, 1 tbsp = 14.79 ml → 29.58 ml → back to dominant unit (tsp, most frequent)
    // 29.58 ml / 4.93 ml per tsp ≈ 6 tsp — rounded to nearest 0.25 = 6
    expect(result.totalUnit).toBe('tsp');
    expect(result.totalAmount).toBeGreaterThan(5);
    expect(result.totalAmount).toBeLessThan(7);
  });

  // Cross-unit weight merge: oz + lb
  test('merges oz and lb by converting through g', () => {
    const quantities: ParsedQuantity[] = [
      { amount: 8, unit: 'oz', originalText: '8 oz chicken' },
      { amount: 0.5, unit: 'lb', originalText: '0.5 lb chicken' },
    ];
    const result = aggregateQuantitiesSmart('chicken', quantities);
    // 8 oz = 226.8 g, 0.5 lb = 226.795 g → 453.595 g → dominant is oz (most frequent tie→first)
    expect(result.totalUnit).toBe('oz');
    // 453.595 g / 28.35 g per oz ≈ 16 oz — rounded to nearest 5 → 15 or 20 for g, but in oz: 16
    expect(result.totalAmount).toBeCloseTo(16, 0);
  });

  // Mixed-dimension: volume + weight → keep BOTH lines, do NOT merge
  test('does NOT merge cup (volume) and g (weight) — keeps both lines', () => {
    const quantities: ParsedQuantity[] = [
      { amount: 1, unit: 'cup', originalText: '1 cup flour' },
      { amount: 100, unit: 'g', originalText: '100g flour' },
    ];
    const result = aggregateQuantitiesSmart('flour', quantities);
    // Must preserve both lines separately
    expect(result.lines).toHaveLength(2);
    expect(result.lines.some((l: { unit: string }) => l.unit === 'cup')).toBe(true);
    expect(result.lines.some((l: { unit: string }) => l.unit === 'g')).toBe(true);
  });

  // Count items remain count
  test('merges count items correctly', () => {
    const quantities: ParsedQuantity[] = [
      { amount: 2, unit: 'piece', originalText: '2 eggs' },
      { amount: 3, unit: 'piece', originalText: '3 eggs' },
    ];
    const result = aggregateQuantitiesSmart('eggs', quantities);
    expect(result.totalAmount).toBe(5);
    expect(result.totalUnit).toBe('piece');
  });

  // Display rounding: ml/g → nearest 5
  test('rounds ml to nearest 5 for display', () => {
    const quantities: ParsedQuantity[] = [
      { amount: 247, unit: 'ml', originalText: '247 ml milk' },
    ];
    const result = aggregateQuantitiesSmart('milk', quantities);
    expect(result.totalUnit).toBe('ml');
    // 247 rounded to nearest 5 = 245
    expect(result.displayAmount).toBe(245);
  });

  test('rounds g to nearest 5 for display', () => {
    const quantities: ParsedQuantity[] = [
      { amount: 103, unit: 'g', originalText: '103 g butter' },
    ];
    const result = aggregateQuantitiesSmart('butter', quantities);
    expect(result.totalUnit).toBe('g');
    expect(result.displayAmount).toBe(105);
  });

  // Display rounding: tbsp → nearest 0.25
  test('rounds tbsp to nearest 0.25 for display', () => {
    const quantities: ParsedQuantity[] = [
      { amount: 1.1, unit: 'tbsp', originalText: '1.1 tbsp oil' },
    ];
    const result = aggregateQuantitiesSmart('oil', quantities);
    expect(result.totalUnit).toBe('tbsp');
    expect(result.displayAmount).toBe(1.0);
  });

  // Display rounding: cup → nearest 0.125
  test('rounds cup to nearest 0.125 for display', () => {
    const quantities: ParsedQuantity[] = [
      { amount: 1.45, unit: 'cup', originalText: '1.45 cup flour' },
    ];
    const result = aggregateQuantitiesSmart('flour', quantities);
    expect(result.totalUnit).toBe('cup');
    // 1.45 / 0.125 = 11.6 → round = 12 → 12 × 0.125 = 1.5
    expect(result.displayAmount).toBe(1.5);
  });

  // Integer count items
  test('integer count items are whole numbers', () => {
    const quantities: ParsedQuantity[] = [
      { amount: 2.0, unit: 'piece', originalText: '2 onions' },
    ];
    const result = aggregateQuantitiesSmart('onions', quantities);
    expect(Number.isInteger(result.displayAmount)).toBe(true);
    expect(result.displayAmount).toBe(2);
  });

  // Edge: empty list
  test('handles empty quantities array', () => {
    const result = aggregateQuantitiesSmart('sugar', []);
    expect(result.totalAmount).toBe(0);
  });

  // Edge: single item
  test('handles single quantity item', () => {
    const quantities: ParsedQuantity[] = [
      { amount: 2, unit: 'cup', originalText: '2 cups rice' },
    ];
    const result = aggregateQuantitiesSmart('rice', quantities);
    expect(result.totalAmount).toBe(2);
    expect(result.totalUnit).toBe('cup');
  });
});
