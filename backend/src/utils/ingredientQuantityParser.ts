// backend/src/utils/ingredientQuantityParser.ts
// Parse and normalize ingredient quantities for smart shopping list calculations

export interface ParsedQuantity {
  amount: number; // Numeric amount (e.g., 2.5)
  unit: string; // Unit (e.g., "cup", "lb", "oz", "piece")
  originalText: string; // Original text for reference
}

export interface IngredientQuantity {
  name: string;
  parsedQuantities: ParsedQuantity[];
  totalAmount: number;
  totalUnit: string; // Normalized unit
  displayQuantity: string; // Human-readable quantity
}

/**
 * Parse ingredient text to extract quantity and unit
 * Examples:
 * - "2 cups flour" -> { amount: 2, unit: "cup" }
 * - "1/2 lb ground beef" -> { amount: 0.5, unit: "lb" }
 * - "3 eggs" -> { amount: 3, unit: "piece" }
 */
export function parseIngredientQuantity(text: string): ParsedQuantity | null {
  const trimmed = text.trim();
  
  // Pattern: (number/fraction) (unit?) (ingredient name)
  // Match patterns like:
  // - "2 cups flour"
  // - "1/2 lb ground beef"
  // - "3 eggs"
  // - "1.5 cups milk"
  // - "2 1/2 cups sugar"
  
  // Known units (to avoid matching ingredient names as units)
  const knownUnits = [
    'cup', 'cups', 'c',
    'tablespoon', 'tablespoons', 'tbsp', 'tbsps', 'tbs',
    'teaspoon', 'teaspoons', 'tsp', 'tsps',
    'fluid ounce', 'fluid ounces', 'fl oz', 'floz',
    'pint', 'pints', 'pt',
    'quart', 'quarts', 'qt',
    'gallon', 'gallons', 'gal',
    'milliliter', 'milliliters', 'ml',
    'liter', 'liters', 'l',
    'pound', 'pounds', 'lb', 'lbs',
    'ounce', 'ounces', 'oz',
    'gram', 'grams', 'g',
    'kilogram', 'kilograms', 'kg',
    'piece', 'pieces', 'item', 'items', 'each', 'whole',
    'head', 'heads', 'bunch', 'bunches', 'clove', 'cloves',
  ];
  
  const unitPattern = `(${knownUnits.join('|')})`;
  
  const patterns = [
    // Pattern 1: "2 1/2 cups flour" (mixed fraction with unit)
    new RegExp(`^(\\d+)\\s+(\\d+)/(\\d+)\\s+${unitPattern}\\s+(.+)$`, 'i'),
    // Pattern 2: "1/2 cup flour" (simple fraction with unit)
    new RegExp(`^(\\d+)/(\\d+)\\s+${unitPattern}\\s+(.+)$`, 'i'),
    // Pattern 3: "2.5 cups flour" (decimal with unit)
    new RegExp(`^(\\d+\\.?\\d*)\\s+${unitPattern}\\s+(.+)$`, 'i'),
    // Pattern 4: "2 cups flour" (whole number with unit)
    new RegExp(`^(\\d+)\\s+${unitPattern}\\s+(.+)$`, 'i'),
    // Pattern 5: "2 chicken breasts" (number without unit - treat as count)
    /^(\d+)\s+(.+)$/i,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = trimmed.match(pattern);
    if (match) {
      let amount: number;
      let unit: string;

      if (i === 0) {
        // Pattern 1: Mixed fraction with unit "2 1/2 cups flour"
        const whole = parseFloat(match[1]);
        const num = parseFloat(match[2]);
        const den = parseFloat(match[3]);
        amount = whole + (num / den);
        unit = match[4]; // Unit is in match[4]
      } else if (i === 1) {
        // Pattern 2: Simple fraction with unit "1/2 cup flour"
        const num = parseFloat(match[1]);
        const den = parseFloat(match[2]);
        amount = num / den;
        unit = match[3]; // Unit is in match[3]
      } else if (i === 2 || i === 3) {
        // Pattern 3 or 4: Decimal/whole number with unit "2.5 cups flour" or "2 cups flour"
        amount = parseFloat(match[1]);
        unit = match[2]; // Unit is in match[2]
      } else if (i === 4) {
        // Pattern 5: Number without unit "2 chicken breasts" - treat as count
        amount = parseFloat(match[1]);
        unit = 'piece';
      } else {
        continue;
      }

      // Normalize unit names
      unit = normalizeUnit(unit);

      return {
        amount,
        unit,
        originalText: trimmed,
      };
    }
  }

  // If no quantity found, assume "as needed" or "1 piece"
  return {
    amount: 1,
    unit: 'piece',
    originalText: trimmed,
  };
}

/**
 * Normalize unit names to standard forms
 */
function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  
  const unitMap: Record<string, string> = {
    // Volume
    'cup': 'cup',
    'cups': 'cup',
    'c': 'cup',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'tbsp': 'tbsp',
    'tbsps': 'tbsp',
    'tbs': 'tbsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'tsp': 'tsp',
    'tsps': 'tsp',
    'fluid ounce': 'fl oz',
    'fluid ounces': 'fl oz',
    'fl oz': 'fl oz',
    'floz': 'fl oz',
    'pint': 'pint',
    'pints': 'pint',
    'pt': 'pint',
    'quart': 'quart',
    'quarts': 'quart',
    'qt': 'quart',
    'gallon': 'gallon',
    'gallons': 'gallon',
    'gal': 'gallon',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'ml': 'ml',
    'liter': 'l',
    'liters': 'l',
    'l': 'l',
    
    // Weight
    'pound': 'lb',
    'pounds': 'lb',
    'lb': 'lb',
    'lbs': 'lb',
    'ounce': 'oz',
    'ounces': 'oz',
    'oz': 'oz',
    'gram': 'g',
    'grams': 'g',
    'g': 'g',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'kg': 'kg',
    
    // Count
    'piece': 'piece',
    'pieces': 'piece',
    'item': 'piece',
    'items': 'piece',
    'each': 'piece',
    'whole': 'piece',
    'head': 'piece',
    'heads': 'piece',
    'bunch': 'bunch',
    'bunches': 'bunch',
    'clove': 'clove',
    'cloves': 'clove',
  };

  return unitMap[normalized] || normalized;
}

/**
 * Ingredient-specific conversion factors (volume to weight)
 * Approximate conversions for common ingredients
 */
const INGREDIENT_DENSITY: Record<string, { cupsPerLb: number }> = {
  // Flours & Grains
  'flour': { cupsPerLb: 3.5 }, // ~3.5 cups per lb
  'all-purpose flour': { cupsPerLb: 3.5 },
  'sugar': { cupsPerLb: 2.25 }, // ~2.25 cups per lb
  'brown sugar': { cupsPerLb: 2.5 },
  'rice': { cupsPerLb: 2.5 },
  'quinoa': { cupsPerLb: 2.5 },
  'pasta': { cupsPerLb: 4 }, // Uncooked pasta
  
  // Liquids (approximate)
  'milk': { cupsPerLb: 2 }, // ~2 cups per lb (close to water)
  'water': { cupsPerLb: 2 },
  'oil': { cupsPerLb: 2.1 },
  'olive oil': { cupsPerLb: 2.1 },
  
  // Vegetables (varies, rough estimates)
  'onion': { cupsPerLb: 2.5 }, // Diced
  'bell pepper': { cupsPerLb: 2.5 }, // Diced
  'tomato': { cupsPerLb: 3 }, // Diced
  'mushroom': { cupsPerLb: 4 }, // Sliced
};

/**
 * Convert between units (basic conversions + ingredient-specific)
 * Returns null if conversion not possible
 */
export function convertUnit(
  amount: number,
  fromUnit: string,
  toUnit: string,
  ingredientName?: string
): number | null {
  if (fromUnit === toUnit) return amount;

  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();

  // Volume conversions (to cups as base)
  const volumeToCups: Record<string, number> = {
    'tsp': 1 / 48,
    'tbsp': 1 / 16,
    'fl oz': 1 / 8,
    'cup': 1,
    'pint': 2,
    'quart': 4,
    'gallon': 16,
    'ml': 1 / 236.588,
    'l': 4.22675,
  };

  // Weight conversions (to pounds as base)
  const weightToLbs: Record<string, number> = {
    'oz': 1 / 16,
    'lb': 1,
    'lbs': 1,
    'g': 1 / 453.592,
    'kg': 2.20462,
  };

  // Try volume to volume conversion
  if (volumeToCups[from] && volumeToCups[to]) {
    const cups = amount * volumeToCups[from];
    return cups / volumeToCups[to];
  }

  // Try weight to weight conversion
  if (weightToLbs[from] && weightToLbs[to]) {
    const lbs = amount * weightToLbs[from];
    return lbs / weightToLbs[to];
  }

  // Try volume to weight conversion (using ingredient density)
  if (ingredientName) {
    const normalizedName = ingredientName.toLowerCase().trim();
    const density = INGREDIENT_DENSITY[normalizedName];
    
    // Try partial match
    if (!density) {
      for (const [key, value] of Object.entries(INGREDIENT_DENSITY)) {
        if (normalizedName.includes(key) || key.includes(normalizedName)) {
          const found = value;
          if (volumeToCups[from] && weightToLbs[to]) {
            // Convert volume to cups, then to pounds using density
            const cups = amount * volumeToCups[from];
            const lbs = cups / found.cupsPerLb;
            return lbs / weightToLbs[to];
          } else if (weightToLbs[from] && volumeToCups[to]) {
            // Convert weight to pounds, then to cups using density
            const lbs = amount * weightToLbs[from];
            const cups = lbs * found.cupsPerLb;
            return cups / volumeToCups[to];
          }
        }
      }
    } else {
      if (volumeToCups[from] && weightToLbs[to]) {
        // Convert volume to cups, then to pounds using density
        const cups = amount * volumeToCups[from];
        const lbs = cups / density.cupsPerLb;
        return lbs / weightToLbs[to];
      } else if (weightToLbs[from] && volumeToCups[to]) {
        // Convert weight to pounds, then to cups using density
        const lbs = amount * weightToLbs[from];
        const cups = lbs * density.cupsPerLb;
        return cups / volumeToCups[to];
      }
    }
  }

  // Can't convert between volume and weight without ingredient info, or unknown units
  return null;
}

/**
 * Aggregate multiple quantities of the same ingredient
 */
export function aggregateQuantities(
  name: string,
  quantities: ParsedQuantity[]
): IngredientQuantity {
  if (quantities.length === 0) {
    return {
      name,
      parsedQuantities: [],
      totalAmount: 0,
      totalUnit: 'piece',
      displayQuantity: '0',
    };
  }

  // Try to normalize all to the same unit (use the most common one)
  const unitCounts = new Map<string, number>();
  quantities.forEach(q => {
    unitCounts.set(q.unit, (unitCounts.get(q.unit) || 0) + 1);
  });
  
  const mostCommonUnit = Array.from(unitCounts.entries())
    .sort((a, b) => b[1] - a[1])[0][0];

  // Convert all to the most common unit and sum
  let totalAmount = 0;
  for (const qty of quantities) {
          if (qty.unit === mostCommonUnit) {
            totalAmount += qty.amount;
          } else {
            const converted = convertUnit(qty.amount, qty.unit, mostCommonUnit, name);
            if (converted !== null) {
              totalAmount += converted;
            } else {
              // Can't convert, just add as-is (will show as "2 cups + 1 lb")
              totalAmount += qty.amount;
            }
          }
  }

  // Format display quantity
  let displayQuantity: string;
  if (totalAmount % 1 === 0) {
    displayQuantity = totalAmount.toString();
  } else if (totalAmount < 1) {
    // Convert to fraction if less than 1
    const fraction = decimalToFraction(totalAmount);
    displayQuantity = fraction;
  } else {
    // Round to 2 decimal places
    displayQuantity = totalAmount.toFixed(2);
  }

  return {
    name,
    parsedQuantities: quantities,
    totalAmount,
    totalUnit: mostCommonUnit,
    displayQuantity: `${displayQuantity} ${mostCommonUnit}`,
  };
}

/**
 * Convert decimal to fraction (simple approximation)
 */
function decimalToFraction(decimal: number): string {
  const commonFractions: Array<[number, string]> = [
    [0.125, '1/8'],
    [0.25, '1/4'],
    [0.333, '1/3'],
    [0.5, '1/2'],
    [0.667, '2/3'],
    [0.75, '3/4'],
  ];

  for (const [value, fraction] of commonFractions) {
    if (Math.abs(decimal - value) < 0.01) {
      return fraction;
    }
  }

  return decimal.toFixed(2);
}

