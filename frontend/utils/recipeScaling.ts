/**
 * Utility functions for scaling recipes for meal prep
 */

export interface ScaledIngredient {
  originalText: string;
  scaledText: string;
  originalAmount: number;
  scaledAmount: number;
  unit: string;
  ingredientName: string;
}

export interface ScaledRecipe {
  servings: number;
  servingsToFreeze: number;
  servingsForWeek: number;
  ingredients: ScaledIngredient[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

/**
 * Parse ingredient text to extract quantity and unit
 * Similar to backend parser but simplified for frontend
 */
function parseIngredientQuantity(text: string): { amount: number; unit: string; ingredientName: string } | null {
  const trimmed = text.trim();
  
  // Known units
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
    // Mixed fraction with unit: "2 1/2 cups flour"
    new RegExp(`^(\\d+)\\s+(\\d+)/(\\d+)\\s+${unitPattern}\\s+(.+)$`, 'i'),
    // Simple fraction with unit: "1/2 cup flour"
    new RegExp(`^(\\d+)/(\\d+)\\s+${unitPattern}\\s+(.+)$`, 'i'),
    // Decimal with unit: "2.5 cups flour"
    new RegExp(`^(\\d+\\.?\\d*)\\s+${unitPattern}\\s+(.+)$`, 'i'),
    // Whole number with unit: "2 cups flour"
    new RegExp(`^(\\d+)\\s+${unitPattern}\\s+(.+)$`, 'i'),
    // Number without unit: "2 chicken breasts"
    /^(\d+)\s+(.+)$/i,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = trimmed.match(pattern);
    if (match) {
      let amount: number;
      let unit: string;
      let ingredientName: string;

      if (i === 0) {
        // Mixed fraction: "2 1/2 cups flour"
        const whole = parseFloat(match[1]);
        const num = parseFloat(match[2]);
        const den = parseFloat(match[3]);
        amount = whole + (num / den);
        unit = match[4].toLowerCase();
        ingredientName = match[5];
      } else if (i === 1) {
        // Simple fraction: "1/2 cup flour"
        const num = parseFloat(match[1]);
        const den = parseFloat(match[2]);
        amount = num / den;
        unit = match[3].toLowerCase();
        ingredientName = match[4];
      } else if (i === 2 || i === 3) {
        // Decimal/whole: "2.5 cups flour" or "2 cups flour"
        amount = parseFloat(match[1]);
        unit = match[2].toLowerCase();
        ingredientName = match[3];
      } else if (i === 4) {
        // Number without unit: "2 chicken breasts"
        amount = parseFloat(match[1]);
        unit = 'piece';
        ingredientName = match[2];
      } else {
        continue;
      }

      return { amount, unit, ingredientName: ingredientName.trim() };
    }
  }

  // If no quantity found, assume "as needed" or "1 piece"
  return { amount: 1, unit: 'piece', ingredientName: trimmed };
}

/**
 * Format a scaled amount nicely (e.g., 2.5 -> "2 1/2", 1.5 -> "1 1/2")
 */
function formatAmount(amount: number): string {
  if (amount === Math.floor(amount)) {
    return amount.toString();
  }
  
  // Try to convert to fraction
  const whole = Math.floor(amount);
  const fraction = amount - whole;
  
  // Common fractions
  const commonFractions: Record<number, string> = {
    0.125: '1/8',
    0.25: '1/4',
    0.333: '1/3',
    0.5: '1/2',
    0.667: '2/3',
    0.75: '3/4',
  };
  
  // Find closest common fraction
  let closestFraction: string | null = null;
  let minDiff = Infinity;
  for (const [dec, frac] of Object.entries(commonFractions)) {
    const diff = Math.abs(fraction - parseFloat(dec));
    if (diff < minDiff && diff < 0.1) {
      minDiff = diff;
      closestFraction = frac;
    }
  }
  
  if (closestFraction) {
    if (whole > 0) {
      return `${whole} ${closestFraction}`;
    }
    return closestFraction;
  }
  
  // Fallback to decimal with 1 decimal place
  return amount.toFixed(1);
}

/**
 * Scale a recipe to a new serving size
 */
export function scaleRecipe(
  recipe: {
    servings?: number;
    ingredients: string[] | Array<{ text: string }>;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
  },
  newServings: number
): ScaledRecipe {
  const originalServings = recipe.servings || 1;
  const scaleFactor = newServings / originalServings;
  
  // Scale ingredients
  const scaledIngredients: ScaledIngredient[] = [];
  const ingredientList = Array.isArray(recipe.ingredients) 
    ? recipe.ingredients.map(ing => typeof ing === 'string' ? ing : ing.text)
    : [];
  
  ingredientList.forEach(ingredientText => {
    const parsed = parseIngredientQuantity(ingredientText);
    if (parsed) {
      const scaledAmount = parsed.amount * scaleFactor;
      const formattedAmount = formatAmount(scaledAmount);
      const unit = parsed.unit === 'piece' && scaledAmount !== 1 ? 'pieces' : parsed.unit;
      const scaledText = `${formattedAmount} ${unit} ${parsed.ingredientName}`;
      
      scaledIngredients.push({
        originalText: ingredientText,
        scaledText,
        originalAmount: parsed.amount,
        scaledAmount,
        unit: parsed.unit,
        ingredientName: parsed.ingredientName,
      });
    } else {
      // If parsing fails, just duplicate the text
      scaledIngredients.push({
        originalText: ingredientText,
        scaledText: ingredientText,
        originalAmount: 1,
        scaledAmount: 1,
        unit: 'piece',
        ingredientName: ingredientText,
      });
    }
  });
  
  // Scale macros
  return {
    servings: newServings,
    servingsToFreeze: 0, // Will be set by UI
    servingsForWeek: 0, // Will be set by UI
    ingredients: scaledIngredients,
    calories: Math.round(recipe.calories * scaleFactor),
    protein: Math.round(recipe.protein * scaleFactor),
    carbs: Math.round(recipe.carbs * scaleFactor),
    fat: Math.round(recipe.fat * scaleFactor),
    fiber: recipe.fiber ? Math.round(recipe.fiber * scaleFactor) : undefined,
    sugar: recipe.sugar ? Math.round(recipe.sugar * scaleFactor) : undefined,
  };
}

