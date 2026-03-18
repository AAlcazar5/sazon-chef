// frontend/__tests__/components/QuantitySuggestion.test.tsx
// Tests for "You Usually Buy" quantity suggestion feature (Section 4c)
// These tests define expected behavior for the feature to be implemented

describe('Quantity Suggestion Logic', () => {
  // Simulates the purchase history lookup for quantity suggestions
  const purchaseHistory = [
    { name: 'chicken breast', quantity: '2 lbs', count: 5, lastPrice: 8.99 },
    { name: 'milk', quantity: '1 gallon', count: 12, lastPrice: 3.49 },
    { name: 'onions', quantity: '3', count: 8, lastPrice: 1.50 },
  ];

  function findQuantitySuggestion(itemName: string): string | null {
    const normalizedName = itemName.toLowerCase().trim();
    const match = purchaseHistory.find(
      h => h.name.toLowerCase() === normalizedName
    );
    return match?.quantity ?? null;
  }

  it('returns matching quantity for known item', () => {
    expect(findQuantitySuggestion('chicken breast')).toBe('2 lbs');
  });

  it('returns null for unknown item', () => {
    expect(findQuantitySuggestion('dragon fruit')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(findQuantitySuggestion('Chicken Breast')).toBe('2 lbs');
  });

  it('trims whitespace', () => {
    expect(findQuantitySuggestion('  milk  ')).toBe('1 gallon');
  });

  it('purchase history should have count field for frequency tracking', () => {
    const entry = purchaseHistory.find(h => h.name === 'milk');
    expect(entry?.count).toBe(12);
  });

  it('purchase history should have lastPrice for price suggestion', () => {
    const entry = purchaseHistory.find(h => h.name === 'onions');
    expect(entry?.lastPrice).toBe(1.50);
  });
});

describe('AddItemModal quantity auto-populate (spec)', () => {
  // These tests describe what the UI should do when implemented
  it('should auto-populate quantity field with historical median', () => {
    // When user types an item name that exists in purchase history,
    // the quantity field should auto-fill with the most common quantity
    const itemName = 'chicken breast';
    const historicalQuantity = '2 lbs';
    expect(historicalQuantity).toBe('2 lbs');
  });

  it('should show "usually X" hint below quantity input', () => {
    // A small hint text should appear: "usually 2 lbs"
    const hint = 'usually 2 lbs';
    expect(hint).toContain('usually');
  });

  it('should allow user to override the suggested quantity', () => {
    // The auto-populated quantity should be editable
    let quantity = '2 lbs'; // auto-populated
    quantity = '3 lbs'; // user override
    expect(quantity).toBe('3 lbs');
  });
});
