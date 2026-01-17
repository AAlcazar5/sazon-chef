// backend/src/utils/healthGrade.ts
// Health Grade System (A-F) based on objective nutritional criteria
// Implementation of HEALTH_GRADE_PROPOSAL.md

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface HealthGradeResult {
  grade: HealthGrade;
  score: number; // 0-100
  breakdown: {
    macronutrientBalance: number; // 0-25
    calorieDensity: number; // 0-20
    nutrientDensity: number; // 0-25
    ingredientQuality: number; // 0-20
    sugarAndSodium: number; // 0-10
  };
  details: {
    proteinAdequacy: number;
    macroBalance: number;
    fatQuality: number;
    calorieRange: number;
    calorieNutrientRatio: number;
    fiberContent: number;
    proteinEfficiency: number;
    overallNutrientRichness: number;
    wholeFoodsPresence: number;
    processedIngredientsPenalty: number;
    sugarContent: number;
    sodiumContent: number;
  };
}

/**
 * Calculate health grade (A-F) for a recipe based on objective nutritional criteria
 */
export function calculateHealthGrade(recipe: any): HealthGradeResult {
  const calories = recipe.calories || 0;
  const protein = recipe.protein || 0;
  const carbs = recipe.carbs || 0;
  const fat = recipe.fat || 0;
  const fiber = recipe.fiber || 0;
  const sugar = recipe.sugar || null;

  // Get all text for ingredient analysis
  const allText = [
    ...(recipe.ingredients || []).map((i: any) => (i.text || i.name || '').toLowerCase()),
    ...(recipe.instructions || []).map((i: any) => (i.text || i.instruction || '').toLowerCase()),
    (recipe.title || '').toLowerCase(),
    (recipe.description || '').toLowerCase(),
  ].join(' ');

  // 1. Macronutrient Balance (25 points)
  const proteinAdequacy = calculateProteinAdequacy(protein);
  const macroBalance = calculateMacroBalanceScore(calories, protein, carbs, fat);
  const fatQuality = calculateFatQuality(calories, protein, carbs, fat);
  const macronutrientBalance = proteinAdequacy + macroBalance + fatQuality;

  // 2. Calorie Density (20 points)
  const calorieRange = calculateCalorieRangeScore(calories);
  const calorieNutrientRatio = calculateCalorieNutrientRatio(calories, protein, fiber);
  const calorieDensity = calorieRange + calorieNutrientRatio;

  // 3. Nutrient Density (25 points)
  const fiberContent = calculateFiberContent(calories, fiber);
  const proteinEfficiency = calculateProteinEfficiencyScore(calories, protein);
  const overallNutrientRichness = calculateOverallNutrientRichness(allText);
  const nutrientDensity = fiberContent + proteinEfficiency + overallNutrientRichness;

  // 4. Ingredient Quality (20 points)
  const wholeFoodsPresence = calculateWholeFoodsPresence(allText);
  const processedIngredientsPenalty = calculateProcessedIngredientsPenalty(allText);
  const ingredientQuality = wholeFoodsPresence + processedIngredientsPenalty;

  // 5. Sugar & Sodium (10 points)
  const sugarContent = calculateSugarContent(sugar, allText);
  const sodiumContent = calculateSodiumContent(allText);
  const sugarAndSodium = sugarContent + sodiumContent;

  // Total score (0-100)
  const totalScore = Math.round(
    macronutrientBalance +
    calorieDensity +
    nutrientDensity +
    ingredientQuality +
    sugarAndSodium
  );

  // Assign grade
  const grade = assignGrade(totalScore);

  return {
    grade,
    score: Math.max(0, Math.min(100, totalScore)),
    breakdown: {
      macronutrientBalance: Math.round(macronutrientBalance),
      calorieDensity: Math.round(calorieDensity),
      nutrientDensity: Math.round(nutrientDensity),
      ingredientQuality: Math.round(ingredientQuality),
      sugarAndSodium: Math.round(sugarAndSodium),
    },
    details: {
      proteinAdequacy: Math.round(proteinAdequacy),
      macroBalance: Math.round(macroBalance),
      fatQuality: Math.round(fatQuality),
      calorieRange: Math.round(calorieRange),
      calorieNutrientRatio: Math.round(calorieNutrientRatio),
      fiberContent: Math.round(fiberContent),
      proteinEfficiency: Math.round(proteinEfficiency),
      overallNutrientRichness: Math.round(overallNutrientRichness),
      wholeFoodsPresence: Math.round(wholeFoodsPresence),
      processedIngredientsPenalty: Math.round(processedIngredientsPenalty),
      sugarContent: Math.round(sugarContent),
      sodiumContent: Math.round(sodiumContent),
    },
  };
}

/**
 * Calculate protein adequacy score (0-10 points)
 * More lenient to avoid penalizing lighter meals and salads
 */
function calculateProteinAdequacy(protein: number): number {
  if (protein >= 20) return 10;
  if (protein >= 15) return 8;
  if (protein >= 10) return 6;
  if (protein >= 5) return 4;
  return 2; // Even very low protein gets some points - salads are still healthy
}

/**
 * Calculate macro balance score (0-10 points)
 */
function calculateMacroBalanceScore(
  calories: number,
  protein: number,
  carbs: number,
  fat: number
): number {
  if (calories === 0) return 5;

  const proteinPercentage = (protein * 4) / calories;
  const carbsPercentage = (carbs * 4) / calories;
  const fatPercentage = (fat * 9) / calories;

  // Check for severe imbalance (>70% from one macro)
  if (proteinPercentage > 0.70 || carbsPercentage > 0.70 || fatPercentage > 0.70) {
    return 2;
  }

  // Check for moderate imbalance
  if (proteinPercentage > 0.60 || carbsPercentage > 0.60 || fatPercentage > 0.60) {
    return 6;
  }

  // Balanced ratios
  return 10;
}

/**
 * Calculate fat quality score (0-5 points)
 */
function calculateFatQuality(
  calories: number,
  protein: number,
  carbs: number,
  fat: number
): number {
  if (calories === 0) return 3;

  const fatGrams = fat;
  const proteinPercentage = (protein * 4) / calories;
  const carbsPercentage = (carbs * 4) / calories;

  // Very high fat (>40g per meal)
  if (fatGrams > 40) {
    return 1;
  }

  // Lower total fat with higher protein/carb (leaner)
  if (fatGrams <= 25 && (proteinPercentage > 0.20 || carbsPercentage > 0.40)) {
    return 5;
  }

  // Moderate fat
  return 3;
}

/**
 * Calculate calorie range score (0-15 points)
 */
function calculateCalorieRangeScore(calories: number): number {
  if (calories >= 300 && calories <= 600) {
    return 15; // Optimal meal range
  } else if (calories >= 601 && calories <= 750) {
    return 12; // Large meals (slightly high but acceptable)
  } else if (calories >= 150 && calories <= 299) {
    return 12; // Snacks/Light Meals (appropriate for snacks, protein shakes)
  } else if (calories < 150) {
    return 10; // Very Light (acceptable for snacks, beverages, supplements)
  } else if (calories >= 751 && calories <= 900) {
    return 8; // Heavy Meals (high but may be appropriate for some)
  } else {
    return 3; // Very Heavy (>900 calories - excessive)
  }
}

/**
 * Calculate calorie-to-nutrient ratio score (0-5 points)
 */
function calculateCalorieNutrientRatio(
  calories: number,
  protein: number,
  fiber: number
): number {
  if (calories === 0) return 1;

  const proteinEfficiency = protein / calories;
  const fiberEfficiency = fiber / calories;

  // High efficiency (protein per calorie >=0.20 or fiber per calorie >=0.03)
  if (proteinEfficiency >= 0.20 || fiberEfficiency >= 0.03) {
    return 5;
  }

  // Moderate efficiency (0.10-0.20 protein or 0.015-0.03 fiber)
  if (
    (proteinEfficiency >= 0.10 && proteinEfficiency <= 0.20) ||
    (fiberEfficiency >= 0.015 && fiberEfficiency <= 0.03)
  ) {
    return 3;
  }

  // Low efficiency
  return 1;
}

/**
 * Calculate fiber content score (0-10 points)
 * Pro-rated for lower calorie recipes
 */
function calculateFiberContent(calories: number, fiber: number): number {
  if (fiber < 1) return 0;

  // For meals (300+ calories)
  if (calories >= 300) {
    if (fiber >= 5) return 10;
    if (fiber >= 3) return 7;
    if (fiber >= 1) return 4;
    return 0;
  }

  // For snacks/shakes (<300 calories): Pro-rated by calorie ratio
  // Example: 120 cal meal needs 2g fiber for full points (120/300 * 5g = 2g)
  const proRatedTarget = (calories / 300) * 5; // Pro-rate the 5g target
  const proRatedMin = (calories / 300) * 3; // Pro-rate the 3g minimum
  const proRatedLow = (calories / 300) * 1; // Pro-rate the 1g low threshold

  if (fiber >= proRatedTarget) return 10;
  if (fiber >= proRatedMin) return 7;
  if (fiber >= proRatedLow) return 4;
  return 0;
}

/**
 * Calculate protein efficiency score (0-10 points)
 */
function calculateProteinEfficiencyScore(calories: number, protein: number): number {
  if (calories === 0) return 0;

  const ratio = protein / calories;

  if (ratio >= 0.20) return 10; // Excellent (e.g., 120 cal, 24g protein)
  if (ratio >= 0.15) return 8; // Very good
  if (ratio >= 0.10) return 6; // Good
  if (ratio >= 0.05) return 3; // Moderate
  return 0; // Low
}

/**
 * Calculate overall nutrient richness score (0-5 points)
 * Based on ingredient analysis
 */
function calculateOverallNutrientRichness(allText: string): number {
  const healthyIndicators = [
    // General categories
    'vegetable', 'vegetables', 'fruit', 'fruits', 'legume', 'legumes',
    'nut', 'nuts', 'seed', 'seeds', 'lean protein', 'lean meat', 'fish',
    'whole grain', 'whole grains', 'quinoa', 'brown rice', 'oats', 'barley',
    // Specific vegetables (expanded)
    'broccoli', 'spinach', 'kale', 'carrot', 'tomato', 'pepper', 'onion',
    'lettuce', 'arugula', 'romaine', 'cabbage', 'cucumber', 'celery',
    'zucchini', 'squash', 'asparagus', 'green bean', 'pea', 'corn',
    'cauliflower', 'brussels', 'artichoke', 'beet', 'radish', 'mushroom',
    'eggplant', 'avocado', 'sweet potato', 'potato',
    // Proteins
    'salmon', 'chicken breast', 'turkey', 'tofu', 'beans', 'lentils',
    'tuna', 'shrimp', 'egg', 'greek yogurt', 'cottage cheese',
    // Salad-specific
    'salad', 'greens', 'mixed greens', 'spring mix', 'garden',
    'vinaigrette', 'olive oil', 'lemon', 'lime', 'herb', 'herbs'
  ];

  const unhealthyIndicators = [
    'fried', 'deep fried', 'battered', 'processed', 'refined',
    'white bread', 'syrup', 'high fructose', 'artificial', 'preservative'
  ];

  let healthyCount = 0;
  let unhealthyCount = 0;

  for (const indicator of healthyIndicators) {
    if (allText.includes(indicator)) {
      healthyCount++;
    }
  }

  for (const indicator of unhealthyIndicators) {
    if (allText.includes(indicator)) {
      unhealthyCount++;
    }
  }

  // Primarily whole foods, vegetables, fruits, lean proteins
  if (healthyCount >= 4 && unhealthyCount === 0) {
    return 5;
  }

  // Good nutrient content
  if (healthyCount >= 2 && unhealthyCount === 0) {
    return 4;
  }

  // Moderate nutrient content
  if (healthyCount >= 1 && unhealthyCount <= 1) {
    return 3;
  }

  // Mixed content
  if (healthyCount >= 1) {
    return 2;
  }

  // Low nutrient content
  return 1;
}

/**
 * Calculate whole foods presence score (0-10 points)
 */
function calculateWholeFoodsPresence(allText: string): number {
  const wholeFoodKeywords = [
    // General whole food terms
    'whole grain', 'whole wheat', 'fresh', 'raw', 'organic', 'natural',
    'vegetable', 'fruit', 'legume', 'nut', 'seed', 'lean', 'unprocessed',
    // Salad and veggie terms
    'salad', 'greens', 'leafy', 'grilled', 'roasted', 'steamed', 'baked',
    'olive oil', 'avocado', 'tomato', 'cucumber', 'carrot', 'spinach',
    'kale', 'lettuce', 'arugula', 'mixed greens', 'garden'
  ];

  const processedKeywords = [
    'refined', 'processed', 'pre-made', 'packaged', 'instant',
    'white flour', 'deep fried', 'battered'
  ];

  let wholeFoodCount = 0;
  let processedCount = 0;

  for (const keyword of wholeFoodKeywords) {
    if (allText.includes(keyword)) {
      wholeFoodCount++;
    }
  }

  for (const keyword of processedKeywords) {
    if (allText.includes(keyword)) {
      processedCount++;
    }
  }

  // Primarily whole, unprocessed ingredients
  if (wholeFoodCount >= 3 && processedCount === 0) {
    return 10;
  }

  // Good amount of whole foods
  if (wholeFoodCount >= 2 && processedCount === 0) {
    return 8;
  }

  // Some whole foods present
  if (wholeFoodCount >= 1 && processedCount <= 1) {
    return 6;
  }

  // Mix of whole and processed
  if (wholeFoodCount >= 1) {
    return 4;
  }

  // Mostly processed or unknown
  return 3;
}

/**
 * Calculate processed ingredients penalty score (0-10 points)
 * Lower score = more processed
 */
function calculateProcessedIngredientsPenalty(allText: string): number {
  const highlyProcessedIndicators = [
    'refined sugar', 'high fructose', 'corn syrup', 'artificial',
    'preservative', 'hydrogenated', 'trans fat', 'processed meat',
    'hot dog', 'frozen dinner'
  ];

  const moderatelyProcessedKeywords = [
    'soda', 'soda pop', 'candy', 'chips', 'cookies', 'cake', 'pastry',
    'deep fried', 'battered'
  ];

  let highlyProcessedCount = 0;
  let moderateCount = 0;

  for (const indicator of highlyProcessedIndicators) {
    if (allText.includes(indicator)) {
      highlyProcessedCount++;
    }
  }

  for (const keyword of moderatelyProcessedKeywords) {
    if (allText.includes(keyword)) {
      moderateCount++;
    }
  }

  // No processed ingredients detected
  if (highlyProcessedCount === 0 && moderateCount === 0) {
    return 10;
  }

  // No highly processed, some moderate
  if (highlyProcessedCount === 0 && moderateCount <= 2) {
    return 8;
  }

  // Some processed ingredients
  if (highlyProcessedCount <= 1 && moderateCount <= 2) {
    return 6;
  }

  // Moderate amount of processed ingredients
  if (highlyProcessedCount <= 2) {
    return 4;
  }

  // Heavily processed
  return 2;
}

/**
 * Calculate sugar content score (0-5 points)
 * Infers from ingredients if sugar data not available
 */
function calculateSugarContent(sugar: number | null, allText: string): number {
  let sugarAmount = sugar;

  // Infer sugar from ingredients if not available
  if (sugarAmount === null || sugarAmount === undefined) {
    const sugarIndicators = [
      'sugar', 'sugar', 'honey', 'maple syrup', 'agave', 'molasses',
      'brown sugar', 'white sugar', 'cane sugar', 'corn syrup',
      'high fructose', 'sweetener', 'soda', 'juice', 'candy'
    ];

    let sugarCount = 0;
    for (const indicator of sugarIndicators) {
      if (allText.includes(indicator)) {
        sugarCount++;
      }
    }

    // Estimate sugar based on indicators (rough approximation)
    if (sugarCount >= 3) {
      sugarAmount = 30; // High sugar
    } else if (sugarCount >= 2) {
      sugarAmount = 20; // Moderate sugar
    } else if (sugarCount >= 1) {
      sugarAmount = 10; // Low sugar
    } else {
      sugarAmount = 0; // No sugar detected
    }
  }

  // Score based on sugar amount
  if (sugarAmount < 10) return 5;
  if (sugarAmount <= 20) return 3;
  if (sugarAmount <= 30) return 1;
  return 0;
}

/**
 * Calculate sodium content score (0-5 points)
 * Infers from ingredients if sodium data not available
 */
function calculateSodiumContent(allText: string): number {
  const sodiumIndicators = [
    'salt', 'sodium', 'soy sauce', 'teriyaki', 'worcestershire',
    'bacon', 'ham', 'sausage', 'cured', 'pickled', 'brine',
    'canned', 'processed', 'bouillon', 'broth', 'stock cube'
  ];

  let sodiumCount = 0;
  for (const indicator of sodiumIndicators) {
    if (allText.includes(indicator)) {
      sodiumCount++;
    }
  }

  // Estimate sodium based on indicators (rough approximation)
  // Multiple indicators suggest higher sodium
  let estimatedSodium: number;
  if (sodiumCount >= 4) {
    estimatedSodium = 1500; // Very high sodium
  } else if (sodiumCount >= 3) {
    estimatedSodium = 1200; // High sodium
  } else if (sodiumCount >= 2) {
    estimatedSodium = 900; // Moderate sodium
  } else if (sodiumCount >= 1) {
    estimatedSodium = 700; // Moderate-low sodium
  } else {
    estimatedSodium = 400; // Low sodium
  }

  // Score based on estimated sodium
  if (estimatedSodium < 600) return 5;
  if (estimatedSodium <= 1000) return 3;
  if (estimatedSodium <= 1500) return 1;
  return 0;
}

/**
 * Assign health grade based on score
 */
function assignGrade(score: number): HealthGrade {
  // More lenient thresholds to avoid penalizing healthy foods like salads
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

