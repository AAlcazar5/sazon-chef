// backend/src/utils/healthMetricsScoring.ts
// Health metrics integration - Step count based calorie expenditure (Phase 6, Group 12)

export interface HealthMetrics {
  steps: number;
  date?: Date;
}

export interface HealthMetricsScore {
  total: number; // 0-100
  breakdown: {
    expenditureAdjustment: number; // 0-100: Adjust based on calorie expenditure from steps
  };
  details: {
    steps: number;
    calculatedExpenditure: number; // Calories burned from steps
    recommendedCalorieRange: { min: number; max: number };
    fitnessGoalBased: boolean; // Whether range is based on fitness goal or step expenditure
  };
}

/**
 * Get recommended calorie range based on user's fitness goal
 * This is a VERY lenient range - focuses on daily totals, not strict per-meal limits
 */
function getRecommendedCalorieRangeFromGoal(
  fitnessGoal: string | null | undefined,
  userMacroGoals?: { calories: number } | null
): { min: number; max: number } {
  // If user has macro goals set, use those as the base
  if (userMacroGoals && userMacroGoals.calories > 0) {
    // Very lenient range: 10-50% of daily calories per meal
    // This allows for big lunches and small dinners, etc.
    const dailyCalories = userMacroGoals.calories;
    return {
      min: Math.round(dailyCalories * 0.10), // 10% of daily (e.g., 200 cal for 2000 cal/day)
      max: Math.round(dailyCalories * 0.50), // 50% of daily (e.g., 1000 cal for 2000 cal/day)
    };
  }

  // Very lenient default ranges - focus on daily totals, not per-meal
  // These are just general guidelines, not strict limits
  switch (fitnessGoal) {
    case 'lose_weight':
      // Very wide range: 200-800 calories per meal (allows flexibility)
      return { min: 200, max: 800 };
    
    case 'gain_muscle':
      // Wide range: 300-900 calories per meal
      return { min: 300, max: 900 };
    
    case 'gain_weight':
      // Wide range: 300-1000 calories per meal
      return { min: 300, max: 1000 };
    
    case 'maintain':
    default:
      // Wide range: 250-850 calories per meal
      return { min: 250, max: 850 };
  }
}

/**
 * Calculate calories burned from steps based on user's physical profile
 * Uses MET (Metabolic Equivalent of Task) values and user's weight
 */
function calculateStepCalorieExpenditure(
  steps: number,
  userWeightKg: number,
  userHeightCm: number,
  userAge: number,
  userGender: string
): number {
  // Average stride length calculation (meters)
  // For men: height * 0.415
  // For women: height * 0.413
  const strideLengthMeters = userGender.toLowerCase() === 'male' 
    ? (userHeightCm / 100) * 0.415
    : (userHeightCm / 100) * 0.413;
  
  // Distance walked (meters)
  const distanceMeters = steps * strideLengthMeters;
  
  // Distance in kilometers
  const distanceKm = distanceMeters / 1000;
  
  // MET value for walking: varies by speed, but average walking is ~3.5 METs
  // For moderate walking (3-4 mph): 3.5 METs
  const metValue = 3.5;
  
  // Calories burned = METs × weight (kg) × time (hours)
  // Time = distance / average walking speed (km/h)
  // Average walking speed: ~4.8 km/h (3 mph)
  const averageWalkingSpeedKmh = 4.8;
  const timeHours = distanceKm / averageWalkingSpeedKmh;
  
  // Calculate calories burned
  const caloriesBurned = metValue * userWeightKg * timeHours;
  
  return Math.round(caloriesBurned);
}

/**
 * Calculate health metrics score for recipe recommendations
 * Primary: Uses fitness goal from user profile
 * Secondary: Adjusts based on step count expenditure if available
 */
export function calculateHealthMetricsScore(
  recipe: any,
  healthMetrics: HealthMetrics | null,
  physicalProfile?: {
    weightKg: number;
    heightCm: number;
    age: number;
    gender: string;
    activityLevel?: string;
    fitnessGoal?: string;
  } | null,
  userMacroGoals?: {
    calories: number;
  } | null
): HealthMetricsScore {
  // If no physical profile and no macro goals, return neutral score
  if (!physicalProfile && !userMacroGoals) {
    return {
      total: 50,
      breakdown: {
        expenditureAdjustment: 0,
      },
      details: {
        steps: 0,
        calculatedExpenditure: 0,
        recommendedCalorieRange: { min: 0, max: 0 },
        fitnessGoalBased: false,
      },
    };
  }

  // Primary: Get recommended calorie range from fitness goal
  // Step count is NOT used for recipe recommendations - only for expenditure calculation in weight goals
  const goalBasedRange = getRecommendedCalorieRangeFromGoal(
    physicalProfile?.fitnessGoal,
    userMacroGoals
  );

  const recommendedCalorieRange = goalBasedRange;
  const fitnessGoalBased = true;

  // Calculate expenditure adjustment score - VERY lenient, focuses on daily totals
  const recipeCalories = recipe.calories || 0;
  let expenditureAdjustment = 100; // Start at 100 - default to not penalizing

  // Only penalize if recipe is WAY outside the range (very extreme cases)
  // Most recipes should score well since we're focusing on daily totals
  if (recipeCalories < recommendedCalorieRange.min) {
    // Only penalize if it's significantly below (less than 50% of min)
    const deficitPercent = (recommendedCalorieRange.min - recipeCalories) / recommendedCalorieRange.min;
    if (deficitPercent > 0.5) {
      // Recipe is less than 50% of minimum - very small meal
      expenditureAdjustment = Math.max(70, 100 - (deficitPercent * 30)); // Small penalty
    }
  } else if (recipeCalories > recommendedCalorieRange.max) {
    // Only penalize if it's significantly above (more than 150% of max)
    const excessPercent = (recipeCalories - recommendedCalorieRange.max) / recommendedCalorieRange.max;
    if (excessPercent > 0.5) {
      // Recipe is more than 150% of maximum - very large meal
      expenditureAdjustment = Math.max(70, 100 - (excessPercent * 30)); // Small penalty
    }
  }

  // Very minimal adjustments for fitness goals - daily totals matter more
  if (physicalProfile?.fitnessGoal === 'lose_weight') {
    // Only penalize extremely high calorie meals (1500+ calories)
    if (recipeCalories > 1500) {
      expenditureAdjustment = Math.max(0, expenditureAdjustment - 10);
    }
  } else if (physicalProfile?.fitnessGoal === 'gain_muscle' || physicalProfile?.fitnessGoal === 'gain_weight') {
    // Slightly favor high-protein meals regardless of calorie count
    if (recipe.protein >= 25) {
      expenditureAdjustment = Math.min(100, expenditureAdjustment + 5);
    }
  }

  return {
    total: Math.max(0, Math.min(100, Math.round(expenditureAdjustment))),
    breakdown: {
      expenditureAdjustment: Math.round(expenditureAdjustment),
    },
    details: {
      steps: 0, // Step count not used for recipe scoring
      calculatedExpenditure: 0, // Expenditure not used for recipe scoring
      recommendedCalorieRange,
      fitnessGoalBased,
    },
  };
}

/**
 * Analyze health trends from recent step data
 */
export function analyzeHealthTrends(
  recentMetrics: Array<{ steps: number; date?: Date }>
): {
  activityTrend: 'increasing' | 'decreasing' | 'stable';
  avgSteps: number;
  totalSteps: number;
} {
  if (recentMetrics.length < 2) {
    const totalSteps = recentMetrics.reduce((sum, m) => sum + (m.steps || 0), 0);
    return {
      activityTrend: 'stable',
      avgSteps: recentMetrics.length > 0 ? totalSteps / recentMetrics.length : 0,
      totalSteps,
    };
  }

  // Calculate average for first half vs second half
  const midPoint = Math.floor(recentMetrics.length / 2);
  const firstHalf = recentMetrics.slice(0, midPoint);
  const secondHalf = recentMetrics.slice(midPoint);

  const avgStepsFirst = firstHalf.reduce((sum, m) => sum + (m.steps || 0), 0) / firstHalf.length;
  const avgStepsSecond = secondHalf.reduce((sum, m) => sum + (m.steps || 0), 0) / secondHalf.length;

  const activityTrend = avgStepsSecond > avgStepsFirst * 1.1 ? 'increasing' :
                       avgStepsSecond < avgStepsFirst * 0.9 ? 'decreasing' : 'stable';

  const totalSteps = recentMetrics.reduce((sum, m) => sum + (m.steps || 0), 0);
  const avgSteps = totalSteps / recentMetrics.length;

  return { activityTrend, avgSteps, totalSteps };
}
