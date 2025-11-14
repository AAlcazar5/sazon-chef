// frontend/utils/superfoodDetection.ts
/**
 * Superfood Detection Utility (Frontend)
 * Detects superfoods in recipe ingredients by parsing ingredient text strings
 */

// Superfood categories and their variations/aliases (matching backend)
const SUPERFOODS: Record<string, string[]> = {
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
  ingredients: string[] | Array<{ text: string } | { name: string }>
): SuperfoodCategory[] {
  const superfoods = new Set<SuperfoodCategory>();
  
  for (const ingredient of ingredients) {
    let text: string;
    if (typeof ingredient === 'string') {
      text = ingredient;
    } else if ('text' in ingredient) {
      text = ingredient.text;
    } else if ('name' in ingredient) {
      text = ingredient.name;
    } else {
      continue;
    }
    
    const detected = detectSuperfoods(text);
    detected.forEach(sf => superfoods.add(sf));
  }
  
  return Array.from(superfoods);
}

