// backend/src/utils/healthGoalScoring.ts
// Sophisticated health goal matching for Phase 6, Group 11

/**
 * Fitness goal types from UserPhysicalProfile
 */
export type FitnessGoal = 'lose_weight' | 'maintain' | 'gain_muscle' | 'gain_weight';

/**
 * Health goal match score
 */
export interface HealthGoalScore {
  total: number;
  breakdown: {
    calorieAlignment: number;
    proteinAlignment: number;
    macroBalance: number;
    nutrientDensity: number;
  };
}

/**
 * Calculate health goal match score for a recipe based on user's fitness goal
 */
export function calculateHealthGoalMatch(
  recipe: any,
  fitnessGoal: FitnessGoal | null | undefined,
  macroGoals?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null
): HealthGoalScore {
  if (!fitnessGoal) {
    // No fitness goal specified - return neutral score
    return {
      total: 50,
      breakdown: {
        calorieAlignment: 50,
        proteinAlignment: 50,
        macroBalance: 50,
        nutrientDensity: 50
      }
    };
  }

  const calories = recipe.calories || 0;
  const protein = recipe.protein || 0;
  const carbs = recipe.carbs || 0;
  const fat = recipe.fat || 0;
  const fiber = recipe.fiber || 0;

  // Calculate calorie alignment based on fitness goal
  const calorieAlignment = calculateCalorieAlignment(calories, fitnessGoal, macroGoals);

  // Calculate protein alignment based on fitness goal
  const proteinAlignment = calculateProteinAlignment(protein, fitnessGoal, macroGoals);

  // Calculate macro balance score based on fitness goal
  const macroBalance = calculateMacroBalance(calories, protein, carbs, fat, fitnessGoal);

  // Calculate nutrient density score
  const nutrientDensity = calculateNutrientDensity(calories, protein, fiber, fitnessGoal);

  // Weighted total score
  const total = Math.round(
    calorieAlignment * 0.3 +      // 30% weight
    proteinAlignment * 0.35 +     // 35% weight (protein is critical for all goals)
    macroBalance * 0.2 +          // 20% weight
    nutrientDensity * 0.15        // 15% weight
  );

  return {
    total: Math.max(0, Math.min(100, total)),
    breakdown: {
      calorieAlignment: Math.round(calorieAlignment),
      proteinAlignment: Math.round(proteinAlignment),
      macroBalance: Math.round(macroBalance),
      nutrientDensity: Math.round(nutrientDensity)
    }
  };
}

/**
 * Calculate calorie alignment score based on fitness goal
 */
function calculateCalorieAlignment(
  recipeCalories: number,
  fitnessGoal: FitnessGoal,
  macroGoals?: { calories: number } | null
): number {
  // If no macro goals, use general guidelines
  if (!macroGoals) {
    return calculateCalorieAlignmentGeneral(recipeCalories, fitnessGoal);
  }

  const targetCalories = macroGoals.calories;
  const calorieDifference = Math.abs(recipeCalories - targetCalories);
  const percentageDifference = (calorieDifference / targetCalories) * 100;

  // Fitness goal specific adjustments
  switch (fitnessGoal) {
    case 'lose_weight':
      // Prefer recipes slightly under target (better for weight loss)
      if (recipeCalories <= targetCalories * 0.95) {
        return 100; // Excellent - under target
      } else if (recipeCalories <= targetCalories) {
        return 90; // Good - at target
      } else if (percentageDifference <= 10) {
        return 70; // Acceptable - slightly over
      } else if (percentageDifference <= 20) {
        return 50; // Moderate - over by 10-20%
      } else {
        return 30; // Poor - over by >20%
      }

    case 'gain_muscle':
      // Prefer recipes at or slightly over target (supports muscle building)
      if (recipeCalories >= targetCalories * 0.95 && recipeCalories <= targetCalories * 1.1) {
        return 100; // Excellent - at or slightly over target
      } else if (recipeCalories >= targetCalories * 0.85) {
        return 85; // Good - close to target
      } else if (percentageDifference <= 15) {
        return 70; // Acceptable
      } else if (recipeCalories < targetCalories * 0.85) {
        return 40; // Poor - too low for muscle gain
      } else {
        return 60; // Moderate - too high
      }

    case 'gain_weight':
      // Prefer recipes at or over target (supports weight gain)
      if (recipeCalories >= targetCalories) {
        return 100; // Excellent - at or over target
      } else if (recipeCalories >= targetCalories * 0.9) {
        return 85; // Good - close to target
      } else if (recipeCalories >= targetCalories * 0.8) {
        return 70; // Acceptable
      } else {
        return 50; // Poor - too low for weight gain
      }

    case 'maintain':
    default:
      // Prefer recipes close to target (maintenance)
      if (percentageDifference <= 5) {
        return 100; // Excellent - very close to target
      } else if (percentageDifference <= 10) {
        return 85; // Good - close to target
      } else if (percentageDifference <= 20) {
        return 70; // Acceptable
      } else {
        return 50; // Moderate - far from target
      }
  }
}

/**
 * General calorie alignment when no macro goals are available
 */
function calculateCalorieAlignmentGeneral(
  recipeCalories: number,
  fitnessGoal: FitnessGoal
): number {
  switch (fitnessGoal) {
    case 'lose_weight':
      // Prefer lower calorie meals (300-500 range)
      if (recipeCalories >= 300 && recipeCalories <= 500) {
        return 100;
      } else if (recipeCalories >= 250 && recipeCalories <= 600) {
        return 80;
      } else if (recipeCalories < 300) {
        return 70; // Too low might be a snack
      } else {
        return 40; // Too high for weight loss
      }

    case 'gain_muscle':
      // Prefer moderate to high calorie meals (400-700 range)
      if (recipeCalories >= 400 && recipeCalories <= 700) {
        return 100;
      } else if (recipeCalories >= 350 && recipeCalories <= 800) {
        return 80;
      } else if (recipeCalories < 350) {
        return 50; // Too low for muscle building
      } else {
        return 70; // Acceptable but high
      }

    case 'gain_weight':
      // Prefer higher calorie meals (500-800 range)
      if (recipeCalories >= 500 && recipeCalories <= 800) {
        return 100;
      } else if (recipeCalories >= 400) {
        return 80;
      } else {
        return 50; // Too low for weight gain
      }

    case 'maintain':
    default:
      // Prefer moderate calorie meals (400-600 range)
      if (recipeCalories >= 400 && recipeCalories <= 600) {
        return 100;
      } else if (recipeCalories >= 300 && recipeCalories <= 700) {
        return 80;
      } else {
        return 60; // Acceptable
      }
  }
}

/**
 * Calculate protein alignment score based on fitness goal
 */
function calculateProteinAlignment(
  recipeProtein: number,
  fitnessGoal: FitnessGoal,
  macroGoals?: { protein: number } | null
): number {
  // If no macro goals, use general guidelines
  if (!macroGoals) {
    return calculateProteinAlignmentGeneral(recipeProtein, fitnessGoal);
  }

  const targetProtein = macroGoals.protein;
  const proteinDifference = Math.abs(recipeProtein - targetProtein);
  const percentageDifference = (proteinDifference / targetProtein) * 100;

  // Fitness goal specific adjustments
  switch (fitnessGoal) {
    case 'lose_weight':
      // High protein is crucial for muscle preservation during weight loss
      // Prefer recipes at or above target
      if (recipeProtein >= targetProtein) {
        return 100; // Excellent - meets or exceeds target
      } else if (recipeProtein >= targetProtein * 0.85) {
        return 85; // Good - close to target
      } else if (recipeProtein >= targetProtein * 0.7) {
        return 70; // Acceptable
      } else {
        return 50; // Poor - too low for muscle preservation
      }

    case 'gain_muscle':
      // Very high protein is critical for muscle building
      // Strongly prefer recipes at or above target
      if (recipeProtein >= targetProtein) {
        return 100; // Excellent - meets or exceeds target
      } else if (recipeProtein >= targetProtein * 0.9) {
        return 90; // Good - very close to target
      } else if (recipeProtein >= targetProtein * 0.75) {
        return 75; // Acceptable but not ideal
      } else {
        return 40; // Poor - too low for muscle building
      }

    case 'gain_weight':
      // Moderate to high protein is good
      if (recipeProtein >= targetProtein * 0.8) {
        return 100; // Excellent
      } else if (recipeProtein >= targetProtein * 0.6) {
        return 80; // Good
      } else {
        return 60; // Acceptable
      }

    case 'maintain':
    default:
      // Moderate protein alignment
      if (percentageDifference <= 10) {
        return 100; // Excellent - very close to target
      } else if (percentageDifference <= 20) {
        return 85; // Good
      } else if (percentageDifference <= 30) {
        return 70; // Acceptable
      } else {
        return 50; // Moderate
      }
  }
}

/**
 * General protein alignment when no macro goals are available
 */
function calculateProteinAlignmentGeneral(
  recipeProtein: number,
  fitnessGoal: FitnessGoal
): number {
  switch (fitnessGoal) {
    case 'lose_weight':
      // Prefer high protein (20g+ per meal)
      if (recipeProtein >= 25) {
        return 100;
      } else if (recipeProtein >= 20) {
        return 90;
      } else if (recipeProtein >= 15) {
        return 75;
      } else {
        return 50;
      }

    case 'gain_muscle':
      // Prefer very high protein (25g+ per meal)
      if (recipeProtein >= 30) {
        return 100;
      } else if (recipeProtein >= 25) {
        return 95;
      } else if (recipeProtein >= 20) {
        return 80;
      } else {
        return 50;
      }

    case 'gain_weight':
      // Moderate to high protein (15g+ per meal)
      if (recipeProtein >= 20) {
        return 100;
      } else if (recipeProtein >= 15) {
        return 85;
      } else {
        return 70;
      }

    case 'maintain':
    default:
      // Moderate protein (15-25g per meal)
      if (recipeProtein >= 15 && recipeProtein <= 25) {
        return 100;
      } else if (recipeProtein >= 10) {
        return 80;
      } else {
        return 60;
      }
  }
}

/**
 * Calculate macro balance score based on fitness goal
 */
function calculateMacroBalance(
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  fitnessGoal: FitnessGoal
): number {
  if (calories === 0) return 50;

  const proteinPercentage = (protein * 4) / calories;
  const carbsPercentage = (carbs * 4) / calories;
  const fatPercentage = (fat * 9) / calories;

  let macroScore = 50;

  switch (fitnessGoal) {
    case 'lose_weight':
      // Prefer higher protein, moderate carbs, lower fat
      if (proteinPercentage >= 0.25) macroScore += 20; // High protein bonus
      else if (proteinPercentage >= 0.20) macroScore += 10;
      if (carbsPercentage >= 0.35 && carbsPercentage <= 0.50) macroScore += 15; // Moderate carbs
      if (fatPercentage <= 0.30) macroScore += 15; // Lower fat bonus
      break;

    case 'gain_muscle':
      // Prefer very high protein, moderate to high carbs, moderate fat
      if (proteinPercentage >= 0.30) macroScore += 25; // Very high protein bonus
      else if (proteinPercentage >= 0.25) macroScore += 15;
      if (carbsPercentage >= 0.40) macroScore += 15; // Higher carbs for energy
      if (fatPercentage >= 0.20 && fatPercentage <= 0.30) macroScore += 10; // Moderate fat
      break;

    case 'gain_weight':
      // Prefer balanced macros with higher calories
      if (proteinPercentage >= 0.20) macroScore += 15;
      if (carbsPercentage >= 0.40) macroScore += 15; // Higher carbs
      if (fatPercentage >= 0.25) macroScore += 20; // Higher fat for calories
      break;

    case 'maintain':
    default:
      // Prefer balanced macros
      if (proteinPercentage >= 0.20 && proteinPercentage <= 0.30) macroScore += 20;
      if (carbsPercentage >= 0.35 && carbsPercentage <= 0.50) macroScore += 15;
      if (fatPercentage >= 0.20 && fatPercentage <= 0.35) macroScore += 15;
      break;
  }

  return Math.min(100, Math.max(0, macroScore));
}

/**
 * Calculate nutrient density score based on fitness goal
 */
function calculateNutrientDensity(
  calories: number,
  protein: number,
  fiber: number,
  fitnessGoal: FitnessGoal
): number {
  if (calories === 0) return 50;

  // Calculate protein efficiency (protein per calorie)
  const proteinEfficiency = protein / calories;
  // Calculate fiber per calorie
  const fiberEfficiency = fiber / calories;

  let score = 50;

  // Protein efficiency scoring (important for all goals)
  if (proteinEfficiency >= 0.20) {
    score += 30; // Excellent protein efficiency
  } else if (proteinEfficiency >= 0.15) {
    score += 20;
  } else if (proteinEfficiency >= 0.10) {
    score += 10;
  }

  // Fiber scoring (important for weight loss and maintenance)
  if (fitnessGoal === 'lose_weight' || fitnessGoal === 'maintain') {
    if (fiberEfficiency >= 0.03) {
      score += 20; // High fiber bonus
    } else if (fiberEfficiency >= 0.02) {
      score += 10;
    }
  } else {
    // For muscle gain/weight gain, fiber is less critical
    if (fiberEfficiency >= 0.02) {
      score += 10;
    }
  }

  return Math.min(100, Math.max(0, score));
}

