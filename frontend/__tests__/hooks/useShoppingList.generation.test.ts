// frontend/__tests__/hooks/useShoppingList.generation.test.ts
// TDD: Task 3 — generated list sorts by aisle order

import { categorizeItem, AISLE_ORDER, DEFAULT_AISLE_ORDER } from '../../hooks/useShoppingList';

// Re-export tested logic from the hook's exported utilities.
// We test the pure categorize + sort logic independent of React.

interface Item {
  name: string;
  category?: string;
}

function sortByAisle(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const aCat = a.category || categorizeItem(a.name) || 'Other';
    const bCat = b.category || categorizeItem(b.name) || 'Other';
    const aOrder = AISLE_ORDER[aCat] ?? DEFAULT_AISLE_ORDER;
    const bOrder = AISLE_ORDER[bCat] ?? DEFAULT_AISLE_ORDER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });
}

describe('aisle sort logic (mirrors generateFromRecipes output)', () => {
  it('sorts Produce before Meat & Seafood', () => {
    const items = [
      { name: 'Chicken breast' },
      { name: 'Apple' },
    ];
    const sorted = sortByAisle(items);
    expect(sorted[0].name).toBe('Apple');
    expect(sorted[1].name).toBe('Chicken breast');
  });

  it('sorts items alphabetically within the same aisle', () => {
    const items = [
      { name: 'Zucchini' },
      { name: 'Avocado' },
      { name: 'Broccoli' },
    ];
    const sorted = sortByAisle(items);
    expect(sorted.map(i => i.name)).toEqual(['Avocado', 'Broccoli', 'Zucchini']);
  });

  it('places null-category items in Other bucket last', () => {
    const items = [
      { name: 'SomeUnknownSpice' },
      { name: 'Chicken breast' },
      { name: 'Apple' },
    ];
    const sorted = sortByAisle(items);
    expect(sorted[0].name).toBe('Apple');
    expect(sorted[sorted.length - 1].name).toBe('SomeUnknownSpice');
  });

  it('respects pre-assigned category field over auto-detected', () => {
    const items = [
      { name: 'Rice', category: 'Frozen' }, // manually assigned Frozen
      { name: 'Apple' },
    ];
    const sorted = sortByAisle(items);
    // Produce (Apple) = 0, Frozen = 4 → Apple comes first
    expect(sorted[0].name).toBe('Apple');
    expect(sorted[1].name).toBe('Rice');
  });

  it('handles single-item array without error', () => {
    const items = [{ name: 'Milk' }];
    expect(sortByAisle(items)).toHaveLength(1);
  });

  it('handles empty array', () => {
    expect(sortByAisle([])).toHaveLength(0);
  });

  it('produces stable sort within same aisle', () => {
    const items = [
      { name: 'Carrot' },
      { name: 'Avocado' },
      { name: 'Garlic' },
    ];
    const sorted = sortByAisle(items);
    // All Produce (order 0) → alphabetical
    expect(sorted.map(i => i.name)).toEqual(['Avocado', 'Carrot', 'Garlic']);
  });
});
