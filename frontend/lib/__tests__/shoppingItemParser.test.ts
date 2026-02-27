import {
  parseShoppingInput,
  isMultiItemInput,
  extractEmbeddedQuantity,
} from '../shoppingItemParser';

describe('parseShoppingInput', () => {
  it('returns empty array for empty input', () => {
    expect(parseShoppingInput('')).toEqual([]);
    expect(parseShoppingInput('  ')).toEqual([]);
    expect(parseShoppingInput(null as any)).toEqual([]);
    expect(parseShoppingInput(undefined as any)).toEqual([]);
  });

  it('parses a single item with no quantity', () => {
    expect(parseShoppingInput('milk')).toEqual([
      { name: 'milk', quantity: '1' },
    ]);
  });

  it('splits on commas', () => {
    const result = parseShoppingInput('milk, eggs, bread');
    expect(result).toEqual([
      { name: 'milk', quantity: '1' },
      { name: 'eggs', quantity: '1' },
      { name: 'bread', quantity: '1' },
    ]);
  });

  it('splits on "and"', () => {
    const result = parseShoppingInput('milk and eggs');
    expect(result).toEqual([
      { name: 'milk', quantity: '1' },
      { name: 'eggs', quantity: '1' },
    ]);
  });

  it('splits on commas and "and" together', () => {
    const result = parseShoppingInput('milk, eggs, and bread');
    expect(result).toEqual([
      { name: 'milk', quantity: '1' },
      { name: 'eggs', quantity: '1' },
      { name: 'bread', quantity: '1' },
    ]);
  });

  it('splits on newlines', () => {
    const result = parseShoppingInput('milk\neggs\nbread');
    expect(result).toEqual([
      { name: 'milk', quantity: '1' },
      { name: 'eggs', quantity: '1' },
      { name: 'bread', quantity: '1' },
    ]);
  });

  // Compound items
  it('preserves compound items with "and"', () => {
    const result = parseShoppingInput('salt and pepper');
    expect(result).toEqual([
      { name: 'salt and pepper', quantity: '1' },
    ]);
  });

  it('preserves compound items alongside regular splits', () => {
    const result = parseShoppingInput('milk, salt and pepper, and bread');
    expect(result).toEqual([
      { name: 'milk', quantity: '1' },
      { name: 'salt and pepper', quantity: '1' },
      { name: 'bread', quantity: '1' },
    ]);
  });

  it('preserves mac and cheese', () => {
    const result = parseShoppingInput('mac and cheese, eggs');
    expect(result).toEqual([
      { name: 'mac and cheese', quantity: '1' },
      { name: 'eggs', quantity: '1' },
    ]);
  });

  // Quantity + unit
  it('parses quantity with units', () => {
    expect(parseShoppingInput('2 lbs chicken breast')).toEqual([
      { name: 'chicken breast', quantity: '2 lbs' },
    ]);
  });

  it('parses "cans of" pattern', () => {
    expect(parseShoppingInput('3 cans of tomatoes')).toEqual([
      { name: 'tomatoes', quantity: '3 cans' },
    ]);
  });

  it('parses multiple items with quantities', () => {
    const result = parseShoppingInput('2 lbs chicken breast, 3 cans of tomatoes, milk');
    expect(result).toEqual([
      { name: 'chicken breast', quantity: '2 lbs' },
      { name: 'tomatoes', quantity: '3 cans' },
      { name: 'milk', quantity: '1' },
    ]);
  });

  it('parses various units', () => {
    expect(parseShoppingInput('1 gallon milk')).toEqual([
      { name: 'milk', quantity: '1 gallon' },
    ]);
    expect(parseShoppingInput('2 bags of spinach')).toEqual([
      { name: 'spinach', quantity: '2 bags' },
    ]);
    expect(parseShoppingInput('1 bunch cilantro')).toEqual([
      { name: 'cilantro', quantity: '1 bunch' },
    ]);
    expect(parseShoppingInput('1 loaf bread')).toEqual([
      { name: 'bread', quantity: '1 loaf' },
    ]);
    expect(parseShoppingInput('3 cloves garlic')).toEqual([
      { name: 'garlic', quantity: '3 cloves' },
    ]);
  });

  // Word quantities
  it('parses "a dozen"', () => {
    expect(parseShoppingInput('a dozen eggs')).toEqual([
      { name: 'eggs', quantity: '12' },
    ]);
  });

  it('parses "half a dozen"', () => {
    expect(parseShoppingInput('half a dozen bagels')).toEqual([
      { name: 'bagels', quantity: '6' },
    ]);
  });

  it('parses "a couple"', () => {
    expect(parseShoppingInput('a couple avocados')).toEqual([
      { name: 'avocados', quantity: '2' },
    ]);
  });

  it('parses "a few"', () => {
    expect(parseShoppingInput('a few lemons')).toEqual([
      { name: 'lemons', quantity: '3' },
    ]);
  });

  // Bare numbers
  it('parses bare number + name', () => {
    expect(parseShoppingInput('3 oranges')).toEqual([
      { name: 'oranges', quantity: '3' },
    ]);
    expect(parseShoppingInput('12 eggs')).toEqual([
      { name: 'eggs', quantity: '12' },
    ]);
  });

  // Complex mixed input
  it('parses the full example from the roadmap', () => {
    const result = parseShoppingInput('milk, eggs, and a dozen oranges');
    expect(result).toEqual([
      { name: 'milk', quantity: '1' },
      { name: 'eggs', quantity: '1' },
      { name: 'oranges', quantity: '12' },
    ]);
  });

  it('handles the complex example', () => {
    const result = parseShoppingInput(
      '2 lbs chicken breast, a dozen eggs, milk, and 3 cans of tomatoes'
    );
    expect(result).toEqual([
      { name: 'chicken breast', quantity: '2 lbs' },
      { name: 'eggs', quantity: '12' },
      { name: 'milk', quantity: '1' },
      { name: 'tomatoes', quantity: '3 cans' },
    ]);
  });

  // Decimal quantities
  it('handles decimal quantities', () => {
    expect(parseShoppingInput('1.5 lbs ground beef')).toEqual([
      { name: 'ground beef', quantity: '1.5 lbs' },
    ]);
  });

  // Whitespace handling
  it('trims whitespace', () => {
    const result = parseShoppingInput('  milk ,  eggs  , bread  ');
    expect(result).toEqual([
      { name: 'milk', quantity: '1' },
      { name: 'eggs', quantity: '1' },
      { name: 'bread', quantity: '1' },
    ]);
  });
});

describe('isMultiItemInput', () => {
  it('returns false for empty input', () => {
    expect(isMultiItemInput('')).toBe(false);
    expect(isMultiItemInput('  ')).toBe(false);
  });

  it('returns false for single items', () => {
    expect(isMultiItemInput('milk')).toBe(false);
    expect(isMultiItemInput('2 lbs chicken')).toBe(false);
  });

  it('returns true for comma-separated items', () => {
    expect(isMultiItemInput('milk, eggs')).toBe(true);
  });

  it('returns true for "and"-separated items', () => {
    expect(isMultiItemInput('milk and eggs')).toBe(true);
  });

  it('returns false for compound items', () => {
    expect(isMultiItemInput('salt and pepper')).toBe(false);
    expect(isMultiItemInput('mac and cheese')).toBe(false);
  });

  it('returns true for compound items mixed with other items', () => {
    expect(isMultiItemInput('salt and pepper, milk')).toBe(true);
    expect(isMultiItemInput('milk and salt and pepper')).toBe(true);
  });
});

describe('extractEmbeddedQuantity', () => {
  it('returns null for empty input', () => {
    expect(extractEmbeddedQuantity('')).toBeNull();
    expect(extractEmbeddedQuantity('  ')).toBeNull();
  });

  it('returns null for items without quantity', () => {
    expect(extractEmbeddedQuantity('milk')).toBeNull();
    expect(extractEmbeddedQuantity('chicken breast')).toBeNull();
  });

  it('extracts quantity with unit', () => {
    expect(extractEmbeddedQuantity('2 lbs chicken breast')).toEqual({
      name: 'chicken breast',
      quantity: '2 lbs',
    });
  });

  it('extracts bare number', () => {
    expect(extractEmbeddedQuantity('3 oranges')).toEqual({
      name: 'oranges',
      quantity: '3',
    });
  });

  it('extracts word quantity', () => {
    expect(extractEmbeddedQuantity('a dozen eggs')).toEqual({
      name: 'eggs',
      quantity: '12',
    });
  });

  it('returns null for multi-item input', () => {
    expect(extractEmbeddedQuantity('milk, eggs')).toBeNull();
    expect(extractEmbeddedQuantity('milk and eggs')).toBeNull();
  });
});
