// frontend/constants/IngredientEmoji.ts
// Common ingredient → emoji mapping for visual scanning in recipe detail,
// shopping list, and cooking mode. ~50 items + fuzzy matching.

const INGREDIENT_EMOJI_MAP: Record<string, string> = {
  // Proteins
  chicken: '🍗',
  beef: '🥩',
  steak: '🥩',
  pork: '🥓',
  bacon: '🥓',
  fish: '🐟',
  salmon: '🐟',
  tuna: '🐟',
  shrimp: '🍤',
  prawn: '🍤',
  egg: '🥚',
  eggs: '🥚',
  tofu: '🧈',
  turkey: '🦃',
  lamb: '🍖',
  sausage: '🌭',

  // Vegetables
  tomato: '🍅',
  tomatoes: '🍅',
  onion: '🧅',
  onions: '🧅',
  garlic: '🧄',
  pepper: '🌶️',
  peppers: '🌶️',
  'bell pepper': '🫑',
  jalapeño: '🌶️',
  carrot: '🥕',
  carrots: '🥕',
  broccoli: '🥦',
  corn: '🌽',
  potato: '🥔',
  potatoes: '🥔',
  'sweet potato': '🍠',
  mushroom: '🍄',
  mushrooms: '🍄',
  lettuce: '🥬',
  spinach: '🥬',
  kale: '🥬',
  cucumber: '🥒',
  avocado: '🥑',
  celery: '🥬',
  peas: '🟢',
  beans: '🫘',
  'green beans': '🫘',
  eggplant: '🍆',
  zucchini: '🥒',
  cabbage: '🥬',
  cauliflower: '🥦',

  // Fruits
  lemon: '🍋',
  lime: '🍋',
  orange: '🍊',
  apple: '🍎',
  banana: '🍌',
  strawberry: '🍓',
  strawberries: '🍓',
  blueberry: '🫐',
  blueberries: '🫐',
  mango: '🥭',
  pineapple: '🍍',
  coconut: '🥥',
  peach: '🍑',
  grape: '🍇',
  grapes: '🍇',
  watermelon: '🍉',

  // Dairy & staples
  milk: '🥛',
  cheese: '🧀',
  butter: '🧈',
  cream: '🥛',
  yogurt: '🥛',
  'sour cream': '🥛',

  // Grains & carbs
  rice: '🍚',
  pasta: '🍝',
  noodles: '🍜',
  bread: '🍞',
  flour: '🌾',
  tortilla: '🫓',
  oats: '🌾',

  // Pantry
  oil: '🫒',
  'olive oil': '🫒',
  vinegar: '🫗',
  'soy sauce': '🫗',
  honey: '🍯',
  sugar: '🍬',
  salt: '🧂',
  chocolate: '🍫',
  cocoa: '🍫',
  'peanut butter': '🥜',
  nuts: '🥜',
  almonds: '🥜',
  walnuts: '🥜',

  // Herbs & spices
  basil: '🌿',
  cilantro: '🌿',
  parsley: '🌿',
  mint: '🌿',
  rosemary: '🌿',
  thyme: '🌿',
  oregano: '🌿',
  ginger: '🫚',
  cinnamon: '🟤',
  cumin: '🟤',
  paprika: '🟤',
  turmeric: '🟡',

  // Beverages & misc
  water: '💧',
  coffee: '☕',
  tea: '🍵',
  wine: '🍷',
  beer: '🍺',
  ice: '🧊',
};

const FALLBACK_EMOJI = '🥄';

/**
 * Get emoji for an ingredient name. Performs fuzzy matching:
 * exact match → word-start match → substring match → fallback.
 */
export function getIngredientEmoji(ingredient: string): string {
  const lower = ingredient.toLowerCase().trim();

  // Exact match
  if (INGREDIENT_EMOJI_MAP[lower]) return INGREDIENT_EMOJI_MAP[lower];

  // Check if any key is contained in the ingredient string
  for (const [key, emoji] of Object.entries(INGREDIENT_EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }

  // Check if ingredient is contained in any key
  for (const [key, emoji] of Object.entries(INGREDIENT_EMOJI_MAP)) {
    if (key.includes(lower)) return emoji;
  }

  return FALLBACK_EMOJI;
}

export { INGREDIENT_EMOJI_MAP, FALLBACK_EMOJI };
