// backend/src/utils/aisleCategorizer.ts
// Server-side aisle categorization — mirrors frontend/hooks/useShoppingList.ts categorizeItem

export function categorizeItem(itemName: string): string | undefined {
  const name = itemName.toLowerCase().trim();
  if (!name) return undefined;

  const frozenKeywords = [
    'frozen', 'ice cream', 'frozen vegetable', 'frozen fruit', 'frozen meal',
  ];
  const produceKeywords = [
    'apple', 'banana', 'orange', 'grape', 'strawberry', 'berry', 'peach', 'pear', 'plum',
    'lettuce', 'spinach', 'kale', 'cabbage', 'broccoli', 'cauliflower', 'carrot', 'celery',
    'onion', 'garlic', 'pepper', 'tomato', 'cucumber', 'zucchini', 'potato', 'sweet potato',
    'avocado', 'mushroom', 'corn', 'pea', 'bean', 'asparagus', 'artichoke', 'beet', 'radish',
    'lemon', 'lime',
  ];
  const meatKeywords = [
    'chicken', 'beef', 'pork', 'turkey', 'lamb', 'bacon', 'sausage', 'ham', 'steak',
    'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallop', 'tilapia', 'cod',
    'ground beef', 'ground turkey', 'chicken breast', 'chicken thigh', 'ribs',
  ];
  const dairyKeywords = [
    'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese',
    'mozzarella', 'cheddar', 'parmesan', 'swiss', 'feta', 'ricotta', 'greek yogurt',
  ];
  const bakeryKeywords = [
    'bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'pita', 'tortilla',
    'cake', 'cookie', 'brownie', 'donut', 'pastry', 'pie crust',
  ];
  const pantryKeywords = [
    'rice', 'pasta', 'noodle', 'flour', 'sugar', 'salt', 'pepper', 'spice', 'herb',
    'oil', 'vinegar', 'soy sauce', 'baking powder', 'baking soda', 'yeast',
    'cereal', 'oatmeal', 'quinoa', 'couscous', 'barley', 'lentil', 'chickpea',
    'canned', 'soup', 'broth', 'stock', 'sauce', 'paste', 'jam', 'jelly',
  ];
  const beverageKeywords = [
    'juice', 'soda', 'water', 'coffee', 'tea', 'beer', 'wine', 'smoothie',
    'lemonade', 'sports drink', 'energy drink', 'sparkling',
  ];
  const snackKeywords = [
    'chip', 'cracker', 'pretzel', 'popcorn', 'nut', 'seed', 'trail mix', 'granola bar',
    'candy', 'chocolate', 'snack', 'dip', 'salsa', 'hummus',
  ];

  if (frozenKeywords.some(kw => name.includes(kw))) return 'Frozen';
  if (snackKeywords.some(kw => name.includes(kw))) return 'Snacks';
  if (beverageKeywords.some(kw => name.includes(kw))) return 'Beverages';
  if (produceKeywords.some(kw => name.includes(kw))) return 'Produce';
  if (meatKeywords.some(kw => name.includes(kw))) return 'Meat & Seafood';
  if (dairyKeywords.some(kw => name.includes(kw))) return 'Dairy';
  if (bakeryKeywords.some(kw => name.includes(kw))) return 'Bakery';
  if (pantryKeywords.some(kw => name.includes(kw))) return 'Pantry';

  return undefined;
}

export const AISLE_ORDER: Record<string, number> = {
  'Produce': 0,
  'Bakery': 1,
  'Meat & Seafood': 2,
  'Dairy': 3,
  'Frozen': 4,
  'Beverages': 5,
  'Snacks': 6,
  'Pantry': 7,
};

export const DEFAULT_AISLE_ORDER = 8;
