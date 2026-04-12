// backend/src/utils/flavorProfile.ts
// Rules-based flavor profile detection from ingredients + cuisine (no AI calls)

export type FlavorIcon = '🌶️' | '🧀' | '🥗' | '🍯' | '🔥' | '❄️';

export interface FlavorProfile {
  icons: FlavorIcon[];
  tags: string[];
}

const SPICY_CUISINES = new Set([
  'thai', 'indian', 'korean', 'mexican', 'sichuan', 'szechuan', 'ethiopian',
  'cajun', 'creole', 'jamaican', 'indonesian', 'malaysian', 'sri lankan',
  'bangladeshi', 'pakistani', 'west african', 'nigerian', 'trinidadian',
]);

const SPICY_INGREDIENTS = [
  'chili', 'chile', 'jalapeño', 'jalapeno', 'habanero', 'serrano',
  'cayenne', 'sriracha', 'hot sauce', 'gochujang', 'gochugaru',
  'red pepper flakes', 'crushed red pepper', 'chipotle', 'thai chili',
  'bird eye', 'ghost pepper', 'scotch bonnet', 'sambal', 'harissa',
  'wasabi', 'horseradish', 'tabasco', 'buffalo',
];

const CHEESY_INGREDIENTS = [
  'cheese', 'cheddar', 'mozzarella', 'parmesan', 'gruyère', 'gruyere',
  'brie', 'cream cheese', 'gouda', 'feta', 'ricotta', 'mascarpone',
  'provolone', 'swiss cheese', 'goat cheese', 'blue cheese', 'queso',
  'fondue', 'mac and cheese', 'nachos', 'pizza',
];

const RICH_INGREDIENTS = [
  'butter', 'heavy cream', 'cream', 'coconut cream', 'ghee', 'lard',
  'bacon', 'pancetta', 'prosciutto', 'alfredo', 'béchamel', 'bechamel',
  'hollandaise', 'béarnaise', 'duck fat', 'foie gras', 'truffle',
];

const FRESH_INGREDIENTS = [
  'lettuce', 'arugula', 'spinach', 'kale', 'cucumber', 'radish',
  'sprouts', 'microgreens', 'watercress', 'mint', 'cilantro', 'dill',
  'basil', 'lemon juice', 'lime juice', 'vinaigrette', 'salad',
  'ceviche', 'poke', 'slaw', 'tahini', 'hummus', 'tzatziki',
  'avocado', 'edamame', 'quinoa',
];

const SWEET_INGREDIENTS = [
  'honey', 'maple syrup', 'brown sugar', 'caramel', 'chocolate',
  'vanilla', 'cinnamon', 'nutella', 'jam', 'jelly', 'marmalade',
  'agave', 'molasses', 'date', 'mango', 'banana', 'berry',
  'strawberry', 'blueberry', 'raspberry', 'peach', 'apple',
  'pineapple', 'coconut sugar', 'powdered sugar', 'glaze',
  'frosting', 'whipped cream', 'ice cream', 'sorbet',
];

const SMOKY_INGREDIENTS = [
  'smoked', 'smoke', 'bbq', 'barbecue', 'grilled', 'charred',
  'chipotle', 'mesquite', 'hickory', 'paprika', 'smoked paprika',
  'liquid smoke', 'fire-roasted', 'blackened', 'charcoal',
  'wood-fired', 'campfire', 'brisket', 'pulled pork',
];

const COLD_KEYWORDS = [
  'cold', 'chilled', 'frozen', 'ice', 'gazpacho', 'smoothie',
  'popsicle', 'sorbet', 'granita', 'shake', 'iced', 'refrigerated',
  'no-bake', 'overnight oats', 'acai bowl', 'cold brew',
  'parfait', 'mousse',
];

function ingredientsMatchAny(ingredientTexts: string[], patterns: string[]): boolean {
  const joined = ingredientTexts.join(' ').toLowerCase();
  return patterns.some(p => joined.includes(p));
}

export function detectFlavorProfile(
  ingredients: Array<{ text: string }> | string[],
  cuisine: string,
  title?: string
): FlavorProfile {
  const ingredientTexts = ingredients.map(i => typeof i === 'string' ? i : i.text);
  const allText = [...ingredientTexts, title || ''].join(' ').toLowerCase();
  const cuisineLower = (cuisine || '').toLowerCase();

  const icons: FlavorIcon[] = [];
  const tags: string[] = [];

  // Spicy
  if (SPICY_CUISINES.has(cuisineLower) || ingredientsMatchAny(ingredientTexts, SPICY_INGREDIENTS)) {
    icons.push('🌶️');
    tags.push('spicy');
  }

  // Cheesy / Rich
  if (ingredientsMatchAny(ingredientTexts, CHEESY_INGREDIENTS)) {
    icons.push('🧀');
    tags.push('cheesy');
  } else if (ingredientsMatchAny(ingredientTexts, RICH_INGREDIENTS)) {
    icons.push('🧀');
    tags.push('rich');
  }

  // Fresh / Light
  if (ingredientsMatchAny(ingredientTexts, FRESH_INGREDIENTS)) {
    icons.push('🥗');
    tags.push('fresh');
  }

  // Sweet
  if (ingredientsMatchAny(ingredientTexts, SWEET_INGREDIENTS)) {
    icons.push('🍯');
    tags.push('sweet');
  }

  // Smoky
  if (ingredientsMatchAny(ingredientTexts, SMOKY_INGREDIENTS)) {
    icons.push('🔥');
    tags.push('smoky');
  }

  // Cold / Refreshing
  const allLower = allText;
  if (COLD_KEYWORDS.some(k => allLower.includes(k))) {
    icons.push('❄️');
    tags.push('refreshing');
  }

  return { icons: icons.slice(0, 3), tags: tags.slice(0, 3) };
}
