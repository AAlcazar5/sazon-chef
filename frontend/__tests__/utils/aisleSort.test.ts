// frontend/__tests__/utils/aisleSort.test.ts
// Tests for aisle sorting and can't-find item ordering

import { categorizeItem, AISLE_ORDER, DEFAULT_AISLE_ORDER } from '../../hooks/useShoppingList';

describe('Aisle Sorting', () => {
  describe('AISLE_ORDER constants', () => {
    it('should define order for all main categories', () => {
      expect(AISLE_ORDER['Produce']).toBe(0);
      expect(AISLE_ORDER['Bakery']).toBe(1);
      expect(AISLE_ORDER['Meat & Seafood']).toBe(2);
      expect(AISLE_ORDER['Dairy']).toBe(3);
      expect(AISLE_ORDER['Frozen']).toBe(4);
      expect(AISLE_ORDER['Beverages']).toBe(5);
      expect(AISLE_ORDER['Snacks']).toBe(6);
      expect(AISLE_ORDER['Pantry']).toBe(7);
    });

    it('should have DEFAULT_AISLE_ORDER higher than all defined categories', () => {
      const maxOrder = Math.max(...Object.values(AISLE_ORDER));
      expect(DEFAULT_AISLE_ORDER).toBeGreaterThan(maxOrder);
    });
  });

  describe('Aisle sort behavior', () => {
    // Simulate the sorting logic from visibleItems memo
    function sortByAisle(
      items: Array<{ id: string; name: string; purchased: boolean; category?: string }>,
      cantFindItems: string[] = []
    ) {
      const cantFindSet = new Set(cantFindItems);
      return [...items].sort((a, b) => {
        const aCantFind = cantFindSet.has(a.id);
        const bCantFind = cantFindSet.has(b.id);
        if (aCantFind !== bCantFind) return aCantFind ? 1 : -1;

        if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;

        const aCategory = a.category || categorizeItem(a.name) || 'Other';
        const bCategory = b.category || categorizeItem(b.name) || 'Other';
        const aOrder = AISLE_ORDER[aCategory] ?? DEFAULT_AISLE_ORDER;
        const bOrder = AISLE_ORDER[bCategory] ?? DEFAULT_AISLE_ORDER;
        if (aOrder !== bOrder) return aOrder - bOrder;

        return 0;
      });
    }

    it('should sort Produce before Dairy before Frozen', () => {
      const items = [
        { id: '1', name: 'Frozen vegetables', purchased: false },
        { id: '2', name: 'Cheddar Cheese', purchased: false },
        { id: '3', name: 'Fresh Tomatoes', purchased: false },
      ];

      const sorted = sortByAisle(items);
      expect(sorted[0].name).toBe('Fresh Tomatoes'); // Produce
      expect(sorted[1].name).toBe('Cheddar Cheese'); // Dairy
      expect(sorted[2].name).toBe('Frozen vegetables'); // Frozen
    });

    it('should place uncategorized items at the end', () => {
      const items = [
        { id: '1', name: 'xyz unknown item', purchased: false },
        { id: '2', name: 'Fresh Spinach', purchased: false },
      ];

      const sorted = sortByAisle(items);
      expect(sorted[0].name).toBe('Fresh Spinach'); // Produce (0)
      expect(sorted[1].name).toBe('xyz unknown item'); // Other (8)
    });

    it('should place purchased items after unpurchased within same sort', () => {
      const items = [
        { id: '1', name: 'Banana', purchased: true },
        { id: '2', name: 'Apple', purchased: false },
      ];

      const sorted = sortByAisle(items);
      expect(sorted[0].name).toBe('Apple'); // unpurchased first
      expect(sorted[1].name).toBe('Banana'); // purchased second
    });

    it('should place can\'t-find items at the very end', () => {
      const items = [
        { id: '1', name: 'Fresh Tomatoes', purchased: false },
        { id: '2', name: 'Chicken Breast', purchased: false },
        { id: '3', name: 'Cheddar Cheese', purchased: false },
      ];

      const sorted = sortByAisle(items, ['1']); // tomatoes can't find
      expect(sorted[0].name).toBe('Chicken Breast'); // Meat & Seafood
      expect(sorted[1].name).toBe('Cheddar Cheese'); // Dairy
      expect(sorted[2].name).toBe('Fresh Tomatoes'); // Can't find (last)
    });

    it('should respect explicit category over auto-detection', () => {
      const items = [
        { id: '1', name: 'Special Item', purchased: false, category: 'Frozen' },
        { id: '2', name: 'Another Item', purchased: false, category: 'Produce' },
      ];

      const sorted = sortByAisle(items);
      expect(sorted[0].name).toBe('Another Item'); // Produce (0)
      expect(sorted[1].name).toBe('Special Item'); // Frozen (4)
    });

    it('should sort all categories in correct store aisle order', () => {
      const items = [
        { id: '1', name: 'White Rice', purchased: false }, // Pantry
        { id: '2', name: 'Soda', purchased: false }, // Beverages
        { id: '3', name: 'Frozen vegetables', purchased: false }, // Frozen
        { id: '4', name: 'Wheat Bread', purchased: false }, // Bakery
        { id: '5', name: 'Fresh Spinach', purchased: false }, // Produce
        { id: '6', name: 'Trail Mix', purchased: false }, // Snacks
        { id: '7', name: 'Whole Milk', purchased: false }, // Dairy
        { id: '8', name: 'Chicken Breast', purchased: false }, // Meat & Seafood
      ];

      const sorted = sortByAisle(items);
      expect(sorted[0].name).toBe('Fresh Spinach'); // Produce (0)
      expect(sorted[1].name).toBe('Wheat Bread'); // Bakery (1)
      expect(sorted[2].name).toBe('Chicken Breast'); // Meat & Seafood (2)
      expect(sorted[3].name).toBe('Whole Milk'); // Dairy (3)
      expect(sorted[4].name).toBe('Frozen vegetables'); // Frozen (4)
      expect(sorted[5].name).toBe('Soda'); // Beverages (5)
      expect(sorted[6].name).toBe('Trail Mix'); // Snacks (6)
      expect(sorted[7].name).toBe('White Rice'); // Pantry (7)
    });
  });
});
