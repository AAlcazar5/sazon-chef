// backend/src/utils/superfoodDetection.ts
/**
 * Superfood Detection Utility
 * Detects superfoods in recipe ingredients by parsing ingredient text strings
 */

// Superfood categories and their variations/aliases
export const SUPERFOODS = {
  // Legumes
  beans: ['beans', 'black beans', 'kidney beans', 'pinto beans', 'navy beans', 'chickpeas', 'garbanzo beans', 'lentils', 'lentil', 'black-eyed peas', 'cannellini beans', 'white beans'],
  
  // Healthy Fats
  oliveOil: ['olive oil', 'extra virgin olive oil', 'evoo', 'virgin olive oil'],
  
  // Fermented Foods
  fermented: ['kimchi', 'sauerkraut', 'yogurt', 'greek yogurt', 'kefir', 'miso', 'tempeh', 'kombucha', 'fermented'],
  
  // Spices
  ginger: ['ginger', 'fresh ginger', 'ginger root', 'ground ginger'],
  turmeric: ['turmeric', 'curcumin'],
  
  // Fish (Omega-3 rich)
  cod: ['cod', 'cod fish', 'cod fillet'],
  sardines: ['sardines', 'sardine', 'canned sardines'],
  salmon: ['salmon', 'salmon fillet', 'wild salmon', 'atlantic salmon', 'pacific salmon'],
  mackerel: ['mackerel', 'mackerel fillet'],
  herring: ['herring', 'herring fillet'],
  
  // Berries
  blueberries: ['blueberries', 'blueberry', 'wild blueberries'],
  strawberries: ['strawberries', 'strawberry'],
  raspberries: ['raspberries', 'raspberry'],
  blackberries: ['blackberries', 'blackberry'],
  
  // Leafy Greens
  spinach: ['spinach', 'baby spinach', 'fresh spinach'],
  kale: ['kale', 'curly kale', 'lacinato kale'],
  arugula: ['arugula', 'rocket'],
  
  // Nuts & Seeds
  almonds: ['almonds', 'almond', 'sliced almonds', 'almond butter'],
  walnuts: ['walnuts', 'walnut', 'walnut pieces'],
  chiaSeeds: ['chia seeds', 'chia seed', 'chia'],
  flaxSeeds: ['flax seeds', 'flaxseed', 'ground flaxseed', 'flax'],
  
  // Whole Grains
  quinoa: ['quinoa', 'quinoa grain'],
  oats: ['oats', 'rolled oats', 'steel-cut oats', 'oatmeal'],
  brownRice: ['brown rice', 'whole grain rice'],
  
  // Other
  avocado: ['avocado', 'avocados', 'avocado oil'],
  sweetPotato: ['sweet potato', 'sweet potatoes', 'yam'],
  broccoli: ['broccoli', 'broccoli florets', 'broccoli crown'],
  garlic: ['garlic', 'garlic cloves', 'minced garlic', 'garlic powder'],
};

export type SuperfoodCategory = keyof typeof SUPERFOODS;

/**
 * Detects superfoods in an ingredient text string
 * @param ingredientText - The ingredient text (e.g., "2 tbsp olive oil")
 * @returns Array of detected superfood categories
 */
export function detectSuperfoods(ingredientText: string): SuperfoodCategory[] {
  if (!ingredientText) return [];
  
  const detected: SuperfoodCategory[] = [];
  const lowerText = ingredientText.toLowerCase();
  
  // Check each superfood category
  for (const [category, variations] of Object.entries(SUPERFOODS)) {
    for (const variation of variations) {
      // Use word boundary matching to avoid false positives
      // e.g., "olive" shouldn't match "olives" unless it's "olive oil"
      const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerText)) {
        detected.push(category as SuperfoodCategory);
        break; // Found a match for this category, move to next
      }
    }
  }
  
  return detected;
}

/**
 * Detects all superfoods in a recipe's ingredients
 * @param ingredients - Array of ingredient text strings or RecipeIngredient objects
 * @returns Set of unique superfood categories found in the recipe
 */
export function detectRecipeSuperfoods(
  ingredients: string[] | Array<{ text: string }>
): Set<SuperfoodCategory> {
  const superfoods = new Set<SuperfoodCategory>();
  
  for (const ingredient of ingredients) {
    const text = typeof ingredient === 'string' ? ingredient : ingredient.text;
    const detected = detectSuperfoods(text);
    detected.forEach(sf => superfoods.add(sf));
  }
  
  return superfoods;
}

/**
 * Gets all available superfood categories for UI selection
 */
export function getAllSuperfoodCategories(): Array<{
  id: SuperfoodCategory;
  name: string;
  description: string;
}> {
  return [
    { id: 'beans', name: 'Beans & Legumes', description: 'Black beans, chickpeas, lentils, etc.' },
    { id: 'oliveOil', name: 'Olive Oil', description: 'Extra virgin olive oil and healthy fats' },
    { id: 'fermented', name: 'Fermented Foods', description: 'Kimchi, yogurt, sauerkraut, miso, etc.' },
    { id: 'ginger', name: 'Ginger', description: 'Fresh or ground ginger' },
    { id: 'turmeric', name: 'Turmeric', description: 'Turmeric and curcumin' },
    { id: 'cod', name: 'Cod', description: 'Cod fish (Omega-3 rich)' },
    { id: 'sardines', name: 'Sardines', description: 'Sardines (Omega-3 rich)' },
    { id: 'salmon', name: 'Salmon', description: 'Salmon (Omega-3 rich)' },
    { id: 'mackerel', name: 'Mackerel', description: 'Mackerel (Omega-3 rich)' },
    { id: 'herring', name: 'Herring', description: 'Herring (Omega-3 rich)' },
    { id: 'blueberries', name: 'Blueberries', description: 'Blueberries and other berries' },
    { id: 'strawberries', name: 'Strawberries', description: 'Strawberries' },
    { id: 'raspberries', name: 'Raspberries', description: 'Raspberries' },
    { id: 'blackberries', name: 'Blackberries', description: 'Blackberries' },
    { id: 'spinach', name: 'Spinach', description: 'Spinach and leafy greens' },
    { id: 'kale', name: 'Kale', description: 'Kale' },
    { id: 'arugula', name: 'Arugula', description: 'Arugula/rocket' },
    { id: 'almonds', name: 'Almonds', description: 'Almonds and almond products' },
    { id: 'walnuts', name: 'Walnuts', description: 'Walnuts' },
    { id: 'chiaSeeds', name: 'Chia Seeds', description: 'Chia seeds' },
    { id: 'flaxSeeds', name: 'Flax Seeds', description: 'Flax seeds' },
    { id: 'quinoa', name: 'Quinoa', description: 'Quinoa' },
    { id: 'oats', name: 'Oats', description: 'Oats and oatmeal' },
    { id: 'brownRice', name: 'Brown Rice', description: 'Brown rice' },
    { id: 'avocado', name: 'Avocado', description: 'Avocado and avocado oil' },
    { id: 'sweetPotato', name: 'Sweet Potato', description: 'Sweet potatoes/yams' },
    { id: 'broccoli', name: 'Broccoli', description: 'Broccoli' },
    { id: 'garlic', name: 'Garlic', description: 'Garlic' },
  ];
}

