// backend/src/utils/ingredientNameExtractor.ts
//
// Extract a normalized ingredient name from raw recipe text like
// "2 cups flour, sifted" → "flour, sifted". Pulled out of
// shoppingListController.ts where two callers had divergent inline
// implementations: one stripped quantity+unit using a unit allowlist,
// the other only stripped leading digits. The behavioral split caused
// duplicate-key bugs in the shopping list aggregator (same ingredient
// surfacing under different keys depending on entry path).
//
// This is the consolidated version. Both generateFromRecipes and
// generateFromMealPlan call it.

const UNIT_WORDS =
  '(cup|cups|lb|lbs|oz|tbsp|tsp|piece|pieces|clove|cloves|bunch|bunches|fl\\s*oz|pint|pints|quart|quarts|gallon|gallons|ml|l|liter|liters|g|gram|grams|kg|kilogram|kilograms)';

/**
 * Extract a normalized ingredient name from a recipe ingredient text.
 *
 * @param text  Raw ingredient line ("2 cups flour, sifted")
 * @param unit  Optional unit hint (from a parsed quantity result). When
 *              provided, the matcher tries to strip "<qty> <unit>" first
 *              for cleaner results.
 * @returns     Lowercase trimmed name, with trailing punctuation removed.
 */
export function extractIngredientName(text: string, unit?: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  // 1. If we have a unit hint, try the strict "qty + unit + name" form first.
  if (unit) {
    const withUnit = new RegExp(`^[\\d\\s\\/\\.]+\\s+${unit}\\s+(.+)$`, 'i');
    const m = trimmed.match(withUnit);
    if (m && m[1]) {
      return cleanup(m[1]);
    }
  }

  // 2. Loose form: "<qty> <name>" without an explicit unit.
  const looseQty = /^[\d\s\/\.]+\s+(.+)$/i;
  const m2 = trimmed.match(looseQty);
  if (m2 && m2[1]) {
    return cleanup(m2[1]);
  }

  // 3. Fallback: strip leading digits, then any leading unit word.
  const fallback = trimmed
    .replace(/^[\d\s\/\.]+/, '')
    .replace(new RegExp(`^\\s*${UNIT_WORDS}\\s+`, 'i'), '');
  return cleanup(fallback || trimmed);
}

function cleanup(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[,\\.]+$/, '')
    .trim();
}
