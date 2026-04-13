// backend/src/services/pantryMatchService.ts
// Pantry-match scoring: given a user's pantry and a recipe's ingredients,
// compute % of ingredients already available and list what's missing.
//
// Normalization strategy: strip quantity prefix, then fuzzy-match at the
// token level (same approach as pantryController.consume). Common staples
// (salt, pepper, oil, water) are never considered "missing".

export interface PantryMatchResult {
  matched: string[];
  missing: string[];
  matchPercentage: number; // 0-100, rounded
  canSubstitute: boolean; // true if every missing item has a common pantry swap
}

const QUANTITY_PREFIX =
  /^[\d./½¼¾⅓⅔⅛\s-]+\s*(?:cups?|tbsp|tbsps?|tsp|tsps?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?|cloves?|heads?|cans?|medium|large|small|pieces?|slices?|stalks?|sprigs?)?\s*(?:of\s+)?/i;

// Staples that virtually every kitchen has — exclude from "missing" count.
const STAPLES = new Set<string>([
  'salt', 'pepper', 'black pepper', 'water', 'ice', 'ice water',
  'olive oil', 'oil', 'vegetable oil', 'cooking oil', 'canola oil',
  'butter', 'unsalted butter',
]);

// Ingredients that typically have common pantry swaps (greek yogurt for sour
// cream, etc.) — used for canSubstitute heuristic.
const SWAPPABLE = new Set<string>([
  'sour cream', 'heavy cream', 'buttermilk', 'milk', 'whole milk',
  'breadcrumbs', 'panko', 'panko breadcrumbs',
  'lemon juice', 'lime juice', 'white wine', 'red wine',
  'parmesan', 'parmesan cheese', 'cheddar', 'mozzarella',
  'yogurt', 'greek yogurt', 'cornstarch', 'flour', 'all-purpose flour',
  'sugar', 'brown sugar', 'honey', 'maple syrup',
]);

export function normalizeIngredient(text: string): string {
  return text
    .toLowerCase()
    .replace(QUANTITY_PREFIX, '')
    .replace(/[,(].*$/, '') // drop trailing "(minced)", ", chopped", etc.
    .replace(/[^a-z\s-]/g, '')
    .trim();
}

function tokens(text: string): string[] {
  return text.split(/\s+/).filter((t) => t.length > 2);
}

export function isStaple(ingredient: string): boolean {
  const n = normalizeIngredient(ingredient);
  if (STAPLES.has(n)) return true;
  return tokens(n).some((t) => STAPLES.has(t));
}

/**
 * Fuzzy match: pantry item matches a recipe ingredient if normalized forms
 * share any meaningful token (length > 2) in either direction, or the pantry
 * name is a substring of the ingredient or vice versa.
 */
export function matchesPantry(ingredient: string, pantryNames: string[]): boolean {
  const ing = normalizeIngredient(ingredient);
  if (!ing) return false;
  const ingTokens = tokens(ing);

  for (const raw of pantryNames) {
    const pn = normalizeIngredient(raw);
    if (!pn) continue;
    if (pn === ing) return true;
    if (ing.includes(pn) || pn.includes(ing)) return true;
    const pnTokens = tokens(pn);
    if (pnTokens.some((t) => ingTokens.includes(t))) return true;
    if (ingTokens.some((t) => pnTokens.includes(t))) return true;
  }
  return false;
}

export function computePantryMatch(
  recipeIngredients: Array<{ text: string }>,
  pantryNames: string[],
): PantryMatchResult {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const ing of recipeIngredients) {
    const text = ing.text;
    if (isStaple(text)) {
      matched.push(text);
      continue;
    }
    if (matchesPantry(text, pantryNames)) {
      matched.push(text);
    } else {
      missing.push(text);
    }
  }

  const total = matched.length + missing.length;
  const matchPercentage = total === 0 ? 0 : Math.round((matched.length / total) * 100);

  const canSubstitute =
    missing.length > 0 &&
    missing.every((m) => {
      const n = normalizeIngredient(m);
      if (SWAPPABLE.has(n)) return true;
      return tokens(n).some((t) => SWAPPABLE.has(t));
    });

  return { matched, missing, matchPercentage, canSubstitute };
}
