// backend/src/services/ingredientSwapService.ts
// Curated ingredient substitution database — no AI per-request, fast lookup.

export interface IngredientSwap {
  alternative: string;
  macroDelta: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  flavorNote: string;
  dietaryTags?: string[]; // tags this swap is SAFE for: 'vegan', 'vegetarian', 'dairy-free', 'gluten-free'
  ratioNote?: string;
}

interface SwapEntry {
  ingredient: string;
  aliases?: string[];
  swaps: IngredientSwap[];
}

// ─── Curated Swap Database ──────────────────────────────────────────────────

const SWAP_DATABASE: SwapEntry[] = [
  {
    ingredient: 'chicken breast',
    aliases: ['chicken breasts', 'boneless chicken breast', 'skinless chicken breast', 'boneless skinless chicken breast'],
    swaps: [
      {
        alternative: 'Chicken thigh',
        macroDelta: { protein: -5, fat: 6, calories: 15 },
        flavorNote: 'Juicier, more forgiving to cook — hard to overcook',
        dietaryTags: [],
      },
      {
        alternative: 'Turkey breast',
        macroDelta: { protein: -2, fat: -2, calories: -15 },
        flavorNote: 'Leaner, similar texture — swap 1:1',
        dietaryTags: [],
      },
      {
        alternative: 'Firm tofu',
        macroDelta: { protein: -11, fat: 2, carbs: 2, calories: -40 },
        flavorNote: 'Plant-based — press well and marinate for best flavor',
        dietaryTags: ['vegan', 'vegetarian'],
      },
      {
        alternative: 'Tempeh',
        macroDelta: { protein: -2, fat: 1, carbs: 4, fiber: 4, calories: -10 },
        flavorNote: 'Nutty, hearty plant-based protein — slice thin and marinate',
        dietaryTags: ['vegan', 'vegetarian'],
      },
      {
        alternative: 'Salmon fillet',
        macroDelta: { protein: -3, fat: 11, calories: 40 },
        flavorNote: 'Rich in omega-3s — adjust cook time, salmon cooks faster',
        dietaryTags: [],
      },
    ],
  },
  {
    ingredient: 'white rice',
    aliases: ['rice', 'cooked white rice', 'jasmine rice', 'long grain rice'],
    swaps: [
      {
        alternative: 'Cauliflower rice',
        macroDelta: { carbs: -35, calories: -150, fiber: 2 },
        flavorNote: 'Low-carb swap — different texture, pulse cauliflower in food processor',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Brown rice',
        macroDelta: { carbs: 2, fiber: 3, calories: 10 },
        flavorNote: 'More fiber and nuttier flavor — add 15 min to cook time',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Quinoa',
        macroDelta: { protein: 4, carbs: -2, fiber: 2, calories: 5 },
        flavorNote: 'Complete protein, slightly nutty — great for grain bowls',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Farro',
        macroDelta: { protein: 3, fiber: 4, carbs: 2, calories: 15 },
        flavorNote: 'Chewy, nutty whole grain — cook like pasta',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free'],
      },
      {
        alternative: 'Shirataki rice',
        macroDelta: { carbs: -40, calories: -180, fat: -1 },
        flavorNote: 'Near zero-calorie — rinse well, dry-toast in pan before using',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
    ],
  },
  {
    ingredient: 'sour cream',
    aliases: ['full fat sour cream'],
    swaps: [
      {
        alternative: 'Plain Greek yogurt',
        macroDelta: { protein: 8, fat: -5, calories: -30 },
        flavorNote: 'Almost identical taste — better macros, higher protein',
        dietaryTags: ['vegetarian', 'gluten-free'],
      },
      {
        alternative: 'Low-fat sour cream',
        macroDelta: { fat: -6, calories: -40 },
        flavorNote: 'Same flavor, significantly less fat — swap 1:1',
        dietaryTags: ['vegetarian', 'gluten-free'],
      },
      {
        alternative: 'Cashew cream',
        macroDelta: { protein: 2, fat: -2, calories: -15 },
        flavorNote: 'Rich, dairy-free alternative — blend soaked cashews with lemon juice',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Silken tofu (blended)',
        macroDelta: { protein: 4, fat: -8, calories: -50 },
        flavorNote: 'Neutral flavor, creamy texture — add splash of lemon juice',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
    ],
  },
  {
    ingredient: 'butter',
    aliases: ['unsalted butter', 'salted butter', 'melted butter'],
    swaps: [
      {
        alternative: 'Olive oil',
        macroDelta: { fat: 0, calories: 0, protein: 0 },
        flavorNote: 'Swap 1:1 — adds Mediterranean flavor, healthier fats',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
        ratioNote: 'Use ¾ cup olive oil per 1 cup butter',
      },
      {
        alternative: 'Avocado oil',
        macroDelta: { fat: 0, calories: 0 },
        flavorNote: 'Neutral flavor, high smoke point — great for high-heat cooking',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Coconut oil',
        macroDelta: { fat: 0, calories: 0 },
        flavorNote: 'Adds subtle coconut flavor — works well in baked goods',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Ghee',
        macroDelta: { fat: 0, calories: 0 },
        flavorNote: 'Richer, nuttier flavor — higher smoke point than butter',
        dietaryTags: ['vegetarian', 'gluten-free'],
      },
      {
        alternative: 'Applesauce (in baking)',
        macroDelta: { fat: -11, carbs: 6, calories: -50 },
        flavorNote: 'For baking only — reduces fat dramatically, adds moisture',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
        ratioNote: 'Swap 1:1 in sweet recipes only',
      },
    ],
  },
  {
    ingredient: 'sugar',
    aliases: ['white sugar', 'granulated sugar', 'cane sugar'],
    swaps: [
      {
        alternative: 'Monk fruit sweetener',
        macroDelta: { carbs: -12, calories: -50 },
        flavorNote: 'Zero calorie, no glycemic impact — swap 1:1',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Stevia',
        macroDelta: { carbs: -12, calories: -48 },
        flavorNote: 'Zero calorie — use ½ the amount, can have slight aftertaste',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
        ratioNote: 'Use ¼–½ tsp stevia per 1 cup sugar',
      },
      {
        alternative: 'Erythritol',
        macroDelta: { carbs: -12, calories: -48 },
        flavorNote: 'Near zero-calorie, slight cooling effect — closest to sugar texture',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Coconut sugar',
        macroDelta: { carbs: 0, calories: 0 },
        flavorNote: 'Same calories but lower glycemic index, caramel notes — swap 1:1',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Honey',
        macroDelta: { carbs: 5, calories: 20 },
        flavorNote: 'Slightly sweeter and more complex flavor — use ¾ the amount',
        dietaryTags: ['vegetarian', 'dairy-free', 'gluten-free'],
        ratioNote: 'Use ¾ cup honey per 1 cup sugar, reduce other liquids by ¼ cup',
      },
    ],
  },
  {
    ingredient: 'all-purpose flour',
    aliases: ['flour', 'white flour', 'ap flour', 'plain flour'],
    swaps: [
      {
        alternative: 'Oat flour',
        macroDelta: { protein: 3, fiber: 2, fat: 1, calories: 5 },
        flavorNote: 'Heartier texture — works great in pancakes, muffins, and cookies',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free'],
      },
      {
        alternative: 'Almond flour',
        macroDelta: { protein: 4, fat: 8, carbs: -15, calories: -10 },
        flavorNote: 'Moist, slightly dense — excellent in low-carb baking',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
        ratioNote: 'Use 1¼ cup almond flour per 1 cup AP flour',
      },
      {
        alternative: 'Whole wheat flour',
        macroDelta: { fiber: 3, protein: 2, calories: 5 },
        flavorNote: 'Nuttier, denser — replace up to half for lighter result',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free'],
      },
      {
        alternative: 'Chickpea flour',
        macroDelta: { protein: 6, fiber: 4, carbs: -5, calories: 0 },
        flavorNote: 'High protein, earthy flavor — great in savory recipes',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Cassava flour',
        macroDelta: { fiber: 1, calories: 5 },
        flavorNote: 'Closest 1:1 gluten-free swap — neutral flavor',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
    ],
  },
  {
    ingredient: 'heavy cream',
    aliases: ['heavy whipping cream', 'double cream', 'whipping cream'],
    swaps: [
      {
        alternative: 'Coconut cream',
        macroDelta: { fat: -2, calories: -10 },
        flavorNote: 'Dairy-free — adds subtle coconut flavor, works beautifully in curries',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Evaporated milk',
        macroDelta: { fat: -20, protein: 4, calories: -120 },
        flavorNote: 'Much lighter — good for sauces and soups, won\'t whip',
        dietaryTags: ['vegetarian', 'gluten-free'],
      },
      {
        alternative: 'Full-fat Greek yogurt',
        macroDelta: { fat: -25, protein: 10, calories: -150 },
        flavorNote: 'Much lower fat — stir in off heat to avoid curdling',
        dietaryTags: ['vegetarian', 'gluten-free'],
      },
      {
        alternative: 'Cashew cream',
        macroDelta: { fat: -18, protein: 4, calories: -100 },
        flavorNote: 'Blended soaked cashews — creamy dairy-free alternative',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
    ],
  },
  {
    ingredient: 'ground beef',
    aliases: ['minced beef', 'beef mince', 'lean ground beef', 'ground chuck'],
    swaps: [
      {
        alternative: 'Ground turkey',
        macroDelta: { fat: -12, protein: 2, calories: -60 },
        flavorNote: 'Leaner with milder flavor — add extra seasoning to compensate',
        dietaryTags: [],
      },
      {
        alternative: 'Ground chicken',
        macroDelta: { fat: -14, protein: 1, calories: -70 },
        flavorNote: 'Lightest option — needs bold spices to shine',
        dietaryTags: [],
      },
      {
        alternative: 'Lentils',
        macroDelta: { protein: -8, carbs: 15, fat: -18, fiber: 10, calories: -80 },
        flavorNote: 'Hearty plant-based swap for tacos, bolognese, stuffed peppers',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Mushrooms (finely chopped)',
        macroDelta: { protein: -18, carbs: 2, fat: -18, fiber: 2, calories: -160 },
        flavorNote: 'Savory umami depth — blend half with lentils for best texture',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Black beans',
        macroDelta: { protein: -4, carbs: 18, fat: -18, fiber: 12, calories: -80 },
        flavorNote: 'Great in tacos or chili — hearty and filling',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
    ],
  },
  {
    ingredient: 'mayo',
    aliases: ['mayonnaise', 'full-fat mayo'],
    swaps: [
      {
        alternative: 'Plain Greek yogurt',
        macroDelta: { fat: -28, protein: 5, calories: -180 },
        flavorNote: 'Lighter with slight tang — perfect in slaws and dips',
        dietaryTags: ['vegetarian', 'gluten-free'],
      },
      {
        alternative: 'Avocado',
        macroDelta: { fat: -12, fiber: 5, calories: -60 },
        flavorNote: 'Rich, creamy with healthy fats — great in sandwiches',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Hummus',
        macroDelta: { fat: -15, protein: 5, fiber: 4, calories: -80 },
        flavorNote: 'Adds savory depth — great as a spread or dip base',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Vegan mayo',
        macroDelta: { fat: -5, calories: -30 },
        flavorNote: 'Nearly identical taste and texture, no eggs — swap 1:1',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free'],
      },
    ],
  },
  {
    ingredient: 'pasta',
    aliases: ['spaghetti', 'penne', 'fettuccine', 'white pasta', 'regular pasta'],
    swaps: [
      {
        alternative: 'Zucchini noodles (zoodles)',
        macroDelta: { carbs: -35, calories: -160, fiber: 2 },
        flavorNote: 'Low-carb, refreshing — spiralize and salt to remove moisture',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Whole wheat pasta',
        macroDelta: { fiber: 4, protein: 2, calories: 5 },
        flavorNote: 'More fiber and protein — slightly chewier texture',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free'],
      },
      {
        alternative: 'Chickpea pasta',
        macroDelta: { protein: 8, fiber: 5, carbs: -8, calories: -10 },
        flavorNote: 'High protein, similar texture — slight legume flavor',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Shirataki noodles',
        macroDelta: { carbs: -40, calories: -180, fat: -1 },
        flavorNote: 'Near zero-calorie — rinse thoroughly, dry-toast before using',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Lentil pasta',
        macroDelta: { protein: 6, fiber: 4, carbs: -5, calories: -5 },
        flavorNote: 'High protein and fiber — earthy flavor, holds up in sauces',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
    ],
  },
  {
    ingredient: 'milk',
    aliases: ['whole milk', 'full-fat milk', 'dairy milk', 'cow milk'],
    swaps: [
      {
        alternative: 'Oat milk',
        macroDelta: { fat: -4, protein: -4, carbs: 4, calories: -15 },
        flavorNote: 'Creamy, slightly sweet — most similar to dairy in coffee and cooking',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free'],
      },
      {
        alternative: 'Almond milk (unsweetened)',
        macroDelta: { fat: -6, protein: -7, carbs: -8, calories: -80 },
        flavorNote: 'Light, neutral — works well in smoothies and cereals',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Soy milk',
        macroDelta: { fat: -3, protein: -1, carbs: 1, calories: -10 },
        flavorNote: 'Closest dairy alternative in protein content — swap 1:1',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Coconut milk (light)',
        macroDelta: { fat: -2, protein: -7, carbs: 1, calories: -25 },
        flavorNote: 'Adds subtle sweetness — best in smoothies and Asian dishes',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
    ],
  },
  {
    ingredient: 'egg',
    aliases: ['eggs', 'whole egg', 'large egg'],
    swaps: [
      {
        alternative: 'Flax egg (1 tbsp ground flax + 3 tbsp water)',
        macroDelta: { protein: -5, fat: 2, carbs: 2, calories: -30 },
        flavorNote: 'For baking only — adds omega-3s, slight nutty flavor',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
        ratioNote: '1 flax egg = 1 large egg',
      },
      {
        alternative: 'Chia egg (1 tbsp chia seeds + 3 tbsp water)',
        macroDelta: { protein: -4, fat: 2, fiber: 5, calories: -25 },
        flavorNote: 'For baking — neutral flavor, adds fiber',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
        ratioNote: '1 chia egg = 1 large egg',
      },
      {
        alternative: 'Aquafaba (3 tbsp chickpea liquid)',
        macroDelta: { protein: -5, fat: -5, calories: -60 },
        flavorNote: 'For baking — best egg white substitute, works for meringue',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Mashed banana (¼ cup)',
        macroDelta: { protein: -5, fat: -5, carbs: 15, calories: -10 },
        flavorNote: 'For sweet baking only — adds natural sweetness and moisture',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Silken tofu (¼ cup blended)',
        macroDelta: { protein: -2, fat: -3, calories: -40 },
        flavorNote: 'For moist baked goods and frittatas — neutral flavor',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
    ],
  },
  {
    ingredient: 'greek yogurt',
    aliases: ['plain greek yogurt', 'full fat greek yogurt', 'nonfat greek yogurt', '0% greek yogurt'],
    swaps: [
      {
        alternative: 'Cottage cheese (blended)',
        macroDelta: { protein: 2, fat: -1, calories: -10 },
        flavorNote: 'Even higher protein — blend smooth for same texture',
        dietaryTags: ['vegetarian', 'gluten-free'],
      },
      {
        alternative: 'Skyr',
        macroDelta: { protein: 2, fat: -1, calories: -15 },
        flavorNote: 'Icelandic yogurt — thicker, higher protein, milder tang',
        dietaryTags: ['vegetarian', 'gluten-free'],
      },
      {
        alternative: 'Coconut yogurt',
        macroDelta: { protein: -9, fat: 4, calories: -15 },
        flavorNote: 'Dairy-free — creamy with subtle coconut flavor',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Cashew yogurt',
        macroDelta: { protein: -7, fat: 3, calories: -5 },
        flavorNote: 'Rich dairy-free alternative — similar tang when cultured',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
    ],
  },
  {
    ingredient: 'olive oil',
    aliases: ['extra virgin olive oil', 'evoo'],
    swaps: [
      {
        alternative: 'Avocado oil',
        macroDelta: { calories: 0, fat: 0 },
        flavorNote: 'Higher smoke point — better for high-heat cooking',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Coconut oil',
        macroDelta: { fat: 0, calories: 0 },
        flavorNote: 'Adds subtle coconut flavor — great for stir-fries and baking',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Ghee',
        macroDelta: { fat: 0, calories: 0 },
        flavorNote: 'Rich, nutty flavor — high smoke point, great for searing',
        dietaryTags: ['vegetarian', 'gluten-free'],
      },
      {
        alternative: 'Sesame oil (1:1 for Asian dishes)',
        macroDelta: { fat: 0, calories: 0 },
        flavorNote: 'Intense nutty flavor — use as finishing oil, not high-heat',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
    ],
  },
  {
    ingredient: 'bread crumbs',
    aliases: ['breadcrumbs', 'panko', 'panko bread crumbs'],
    swaps: [
      {
        alternative: 'Almond flour',
        macroDelta: { carbs: -15, fat: 5, protein: 3, fiber: 2, calories: -30 },
        flavorNote: 'Gluten-free — great for breading chicken or fish',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
      {
        alternative: 'Crushed pork rinds',
        macroDelta: { carbs: -20, protein: 10, fat: 5, calories: -50 },
        flavorNote: 'Zero carb — crispy breading for keto cooking',
        dietaryTags: ['gluten-free'],
      },
      {
        alternative: 'Oat flour',
        macroDelta: { fiber: 2, carbs: -5, calories: -20 },
        flavorNote: 'Whole grain option — slightly less crispy',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free'],
      },
      {
        alternative: 'Crushed rice crackers',
        macroDelta: { carbs: 0, calories: 0 },
        flavorNote: 'Gluten-free, extra crispy — process until fine crumbs',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
      },
    ],
  },
];

// ─── Dietary restriction logic ────────────────────────────────────────────────

const MEAT_INGREDIENTS = ['chicken', 'turkey', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'bacon'];
const DAIRY_INGREDIENTS = ['butter', 'cheese', 'cream', 'milk', 'yogurt', 'ghee', 'whey'];
const GLUTEN_INGREDIENTS = ['flour', 'wheat', 'bread', 'pasta', 'barley', 'rye', 'oat'];

function swapRespectsDietaryRestrictions(swap: IngredientSwap, restrictions: string[]): boolean {
  if (!restrictions || restrictions.length === 0) return true;

  const altLower = swap.alternative.toLowerCase();

  for (const restriction of restrictions) {
    const r = restriction.toLowerCase();

    if ((r === 'vegan' || r === 'vegetarian') && swap.dietaryTags) {
      if (!swap.dietaryTags.includes(r)) return false;
    }

    if (r === 'dairy-free') {
      const hasDairy = DAIRY_INGREDIENTS.some((d) => altLower.includes(d));
      if (hasDairy) return false;
    }

    if (r === 'gluten-free') {
      const hasGluten = GLUTEN_INGREDIENTS.some((g) => altLower.includes(g));
      if (hasGluten) return false;
    }
  }

  return true;
}

// ─── Ingredient matching ──────────────────────────────────────────────────────

const QUANTITY_PREFIX = /^[\d./½¼¾⅓⅔⅛\s-]+\s*(?:cups?|tbsp|tsp|oz|ounces?|lbs?|g|kg|ml|l|cloves?|heads?|cans?|medium|large|small|pieces?)?\s*/i;

/** Strip leading quantity so "2 cups white rice" → "white rice" */
function stripQuantity(text: string): string {
  return text.replace(QUANTITY_PREFIX, '').trim().toLowerCase();
}

function findEntry(ingredient: string): SwapEntry | undefined {
  const normalized = stripQuantity(ingredient);

  return SWAP_DATABASE.find((entry) => {
    if (normalized === entry.ingredient.toLowerCase()) return true;
    if (entry.aliases?.some((alias) => alias.toLowerCase() === normalized)) return true;
    // Partial match: entry key contained in query or vice versa
    if (normalized.includes(entry.ingredient.toLowerCase())) return true;
    if (entry.aliases?.some((alias) => normalized.includes(alias.toLowerCase()))) return true;
    return false;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns 3-5 ingredient swap alternatives for a given ingredient text.
 * Optionally filters results based on the user's dietary restrictions.
 *
 * @param ingredient - Raw ingredient string (e.g. "2 cups white rice", "chicken breast")
 * @param dietaryRestrictions - Array of restriction labels (e.g. ['vegan', 'gluten-free'])
 */
export function getIngredientSwaps(ingredient: string, dietaryRestrictions: string[] = []): IngredientSwap[] {
  const entry = findEntry(ingredient);
  if (!entry) return [];

  const filtered = entry.swaps.filter((swap) => swapRespectsDietaryRestrictions(swap, dietaryRestrictions));
  return filtered.slice(0, 5);
}
