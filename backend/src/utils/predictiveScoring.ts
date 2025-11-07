// backend/src/utils/predictiveScoring.ts
// Predictive scoring based on historical data (Phase 6, Group 11)

import type { UserBehaviorData } from './behavioralScoring';

export interface PredictiveScore {
  total: number; // 0-100
  breakdown: {
    historicalPatternMatch: number; // 0-40: How well recipe matches historical success patterns
    trendAnalysis: number; // 0-30: Based on recent trends vs older patterns
    successProbability: number; // 0-30: Predicted likelihood of user engagement
  };
  details: {
    patternMatches: {
      cuisine: number;
      macroRange: number;
      cookTime: number;
      temporal: number;
    };
    trendStrength: number;
    engagementProbability: number;
  };
}

/**
 * Calculate predictive score based on historical user behavior patterns
 */
export function calculatePredictiveScore(
  recipe: any,
  userBehavior: UserBehaviorData,
  historicalContext?: {
    userPreferences?: any;
    macroGoals?: any;
    temporalContext?: any;
  }
): PredictiveScore {
  // Analyze historical patterns
  const patterns = analyzeHistoricalPatterns(userBehavior);
  
  // Calculate pattern matches
  const patternMatches = calculatePatternMatches(recipe, patterns);
  
  // Calculate trend analysis (recent vs older patterns)
  const trendAnalysis = calculateTrendAnalysis(recipe, userBehavior, patterns);
  
  // Calculate success probability
  const successProbability = calculateSuccessProbability(recipe, patterns);
  
  // Combine into predictive score
  const historicalPatternMatch = Math.round(
    patternMatches.cuisine * 0.35 +
    patternMatches.macroRange * 0.30 +
    patternMatches.cookTime * 0.20 +
    patternMatches.temporal * 0.15
  );
  
  const total = Math.round(
    Math.min(40, historicalPatternMatch) +
    Math.min(30, trendAnalysis) +
    Math.min(30, successProbability)
  );
  
  return {
    total: Math.max(0, Math.min(100, total)),
    breakdown: {
      historicalPatternMatch: Math.min(40, historicalPatternMatch),
      trendAnalysis: Math.min(30, trendAnalysis),
      successProbability: Math.min(30, successProbability),
    },
    details: {
      patternMatches,
      trendStrength: trendAnalysis / 30,
      engagementProbability: successProbability / 30,
    },
  };
}

/**
 * Analyze historical patterns from user behavior
 */
interface HistoricalPatterns {
  preferredCuisines: Map<string, number>; // Cuisine -> engagement rate
  macroRanges: {
    calories: { min: number; max: number; avg: number };
    protein: { min: number; max: number; avg: number };
    carbs: { min: number; max: number; avg: number };
    fat: { min: number; max: number; avg: number };
  };
  cookTimeRange: { min: number; max: number; avg: number };
  temporalPatterns: {
    preferredMealPeriods: Map<string, number>;
    preferredDays: Map<string, number>;
  };
  recentTrends: {
    cuisine: string[];
    macroFocus: 'high-protein' | 'low-calorie' | 'balanced' | 'none';
    cookTimePreference: 'quick' | 'moderate' | 'slow' | 'none';
  };
}

function analyzeHistoricalPatterns(userBehavior: UserBehaviorData): HistoricalPatterns {
  // Combine all positive interactions
  const positiveRecipes = [
    ...userBehavior.likedRecipes,
    ...userBehavior.savedRecipes,
    ...userBehavior.consumedRecipes,
  ];
  
  // Analyze cuisine preferences
  const cuisineEngagement = new Map<string, { count: number; total: number }>();
  const allCuisines = new Set<string>();
  
  positiveRecipes.forEach(r => {
    allCuisines.add(r.cuisine);
    const current = cuisineEngagement.get(r.cuisine) || { count: 0, total: 0 };
    current.count++;
    cuisineEngagement.set(r.cuisine, current);
  });
  
  // Count total occurrences (including disliked)
  userBehavior.dislikedRecipes.forEach(r => {
    allCuisines.add(r.cuisine);
    const current = cuisineEngagement.get(r.cuisine) || { count: 0, total: 0 };
    current.total++;
    cuisineEngagement.set(r.cuisine, current);
  });
  
  // Calculate engagement rates
  const preferredCuisines = new Map<string, number>();
  cuisineEngagement.forEach((value, cuisine) => {
    const totalOccurrences = value.total + value.count;
    const engagementRate = totalOccurrences > 0 ? value.count / totalOccurrences : 0;
    preferredCuisines.set(cuisine, engagementRate);
  });
  
  // Analyze macro ranges
  const calories = positiveRecipes.map(r => r.calories);
  const protein = positiveRecipes.map(r => r.protein);
  const carbs = positiveRecipes.map(r => r.carbs);
  const fat = positiveRecipes.map(r => r.fat);
  
  const macroRanges = {
    calories: {
      min: calories.length > 0 ? Math.min(...calories) : 0,
      max: calories.length > 0 ? Math.max(...calories) : 0,
      avg: calories.length > 0 ? calories.reduce((a, b) => a + b, 0) / calories.length : 0,
    },
    protein: {
      min: protein.length > 0 ? Math.min(...protein) : 0,
      max: protein.length > 0 ? Math.max(...protein) : 0,
      avg: protein.length > 0 ? protein.reduce((a, b) => a + b, 0) / protein.length : 0,
    },
    carbs: {
      min: carbs.length > 0 ? Math.min(...carbs) : 0,
      max: carbs.length > 0 ? Math.max(...carbs) : 0,
      avg: carbs.length > 0 ? carbs.reduce((a, b) => a + b, 0) / carbs.length : 0,
    },
    fat: {
      min: fat.length > 0 ? Math.min(...fat) : 0,
      max: fat.length > 0 ? Math.max(...fat) : 0,
      avg: fat.length > 0 ? fat.reduce((a, b) => a + b, 0) / fat.length : 0,
    },
  };
  
  // Analyze cook time range
  const cookTimes = positiveRecipes.map(r => r.cookTime);
  const cookTimeRange = {
    min: cookTimes.length > 0 ? Math.min(...cookTimes) : 0,
    max: cookTimes.length > 0 ? Math.max(...cookTimes) : 0,
    avg: cookTimes.length > 0 ? cookTimes.reduce((a, b) => a + b, 0) / cookTimes.length : 0,
  };
  
  // Analyze recent trends (last 30 days vs older)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const recentRecipes = positiveRecipes.filter(r => {
    const date = 'createdAt' in r ? r.createdAt : 
                 'savedDate' in r ? r.savedDate : 
                 'date' in r ? r.date : null;
    return date && new Date(date) >= thirtyDaysAgo;
  });
  
  const recentCuisines = recentRecipes.map(r => r.cuisine);
  const recentCuisineCounts = new Map<string, number>();
  recentCuisines.forEach(cuisine => {
    recentCuisineCounts.set(cuisine, (recentCuisineCounts.get(cuisine) || 0) + 1);
  });
  
  const recentTrends = {
    cuisine: Array.from(recentCuisineCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cuisine]) => cuisine),
    macroFocus: analyzeMacroTrend(recentRecipes, positiveRecipes) as any,
    cookTimePreference: analyzeCookTimeTrend(recentRecipes, positiveRecipes) as any,
  };
  
  return {
    preferredCuisines,
    macroRanges,
    cookTimeRange,
    temporalPatterns: {
      preferredMealPeriods: new Map(), // Can be enhanced with temporal data
      preferredDays: new Map(),
    },
    recentTrends,
  };
}

/**
 * Calculate how well recipe matches historical patterns
 */
function calculatePatternMatches(
  recipe: any,
  patterns: HistoricalPatterns
): {
  cuisine: number;
  macroRange: number;
  cookTime: number;
  temporal: number;
} {
  // Cuisine match (0-100)
  const cuisineEngagementRate = patterns.preferredCuisines.get(recipe.cuisine) || 0;
  const cuisineMatch = Math.round(cuisineEngagementRate * 100);
  
  // Macro range match (0-100)
  const macroMatch = calculateMacroRangeMatch(recipe, patterns.macroRanges);
  
  // Cook time match (0-100)
  const cookTimeMatch = calculateCookTimeMatch(recipe, patterns.cookTimeRange);
  
  // Temporal match (default to 50 if no data)
  const temporalMatch = 50;
  
  return {
    cuisine: cuisineMatch,
    macroRange: macroMatch,
    cookTime: cookTimeMatch,
    temporal: temporalMatch,
  };
}

/**
 * Calculate macro range match score
 */
function calculateMacroRangeMatch(
  recipe: any,
  macroRanges: HistoricalPatterns['macroRanges']
): number {
  if (macroRanges.calories.avg === 0) return 50; // No historical data
  
  let matchScore = 0;
  let factors = 0;
  
  // Calorie match
  if (recipe.calories >= macroRanges.calories.min && recipe.calories <= macroRanges.calories.max) {
    matchScore += 30; // Within range
  } else {
    const avgDiff = Math.abs(recipe.calories - macroRanges.calories.avg);
    const range = macroRanges.calories.max - macroRanges.calories.min || 100;
    const match = Math.max(0, 30 * (1 - avgDiff / range));
    matchScore += match;
  }
  factors++;
  
  // Protein match
  if (recipe.protein >= macroRanges.protein.min && recipe.protein <= macroRanges.protein.max) {
    matchScore += 25;
  } else {
    const avgDiff = Math.abs(recipe.protein - macroRanges.protein.avg);
    const range = macroRanges.protein.max - macroRanges.protein.min || 20;
    const match = Math.max(0, 25 * (1 - avgDiff / range));
    matchScore += match;
  }
  factors++;
  
  // Carbs match
  if (recipe.carbs >= macroRanges.carbs.min && recipe.carbs <= macroRanges.carbs.max) {
    matchScore += 25;
  } else {
    const avgDiff = Math.abs(recipe.carbs - macroRanges.carbs.avg);
    const range = macroRanges.carbs.max - macroRanges.carbs.min || 50;
    const match = Math.max(0, 25 * (1 - avgDiff / range));
    matchScore += match;
  }
  factors++;
  
  // Fat match
  if (recipe.fat >= macroRanges.fat.min && recipe.fat <= macroRanges.fat.max) {
    matchScore += 20;
  } else {
    const avgDiff = Math.abs(recipe.fat - macroRanges.fat.avg);
    const range = macroRanges.fat.max - macroRanges.fat.min || 30;
    const match = Math.max(0, 20 * (1 - avgDiff / range));
    matchScore += match;
  }
  factors++;
  
  return Math.round(matchScore);
}

/**
 * Calculate cook time match score
 */
function calculateCookTimeMatch(
  recipe: any,
  cookTimeRange: HistoricalPatterns['cookTimeRange']
): number {
  if (cookTimeRange.avg === 0) return 50; // No historical data
  
  if (recipe.cookTime >= cookTimeRange.min && recipe.cookTime <= cookTimeRange.max) {
    return 100; // Within preferred range
  }
  
  const avgDiff = Math.abs(recipe.cookTime - cookTimeRange.avg);
  const range = cookTimeRange.max - cookTimeRange.min || 30;
  const match = Math.max(0, 100 * (1 - avgDiff / range));
  
  return Math.round(match);
}

/**
 * Calculate trend analysis score
 */
function calculateTrendAnalysis(
  recipe: any,
  userBehavior: UserBehaviorData,
  patterns: HistoricalPatterns
): number {
  let trendScore = 0;
  
  // Recent cuisine trend
  if (patterns.recentTrends.cuisine.includes(recipe.cuisine)) {
    trendScore += 15; // Strong trend match
  }
  
  // Recent macro focus trend
  const macroTrend = patterns.recentTrends.macroFocus;
  if (macroTrend === 'high-protein' && recipe.protein >= 25) {
    trendScore += 8;
  } else if (macroTrend === 'low-calorie' && recipe.calories <= 400) {
    trendScore += 8;
  } else if (macroTrend === 'balanced') {
    // Check if macros are balanced
    const totalCals = recipe.protein * 4 + recipe.carbs * 4 + recipe.fat * 9;
    const proteinPct = (recipe.protein * 4) / totalCals;
    const carbsPct = (recipe.carbs * 4) / totalCals;
    const fatPct = (recipe.fat * 9) / totalCals;
    
    if (proteinPct >= 0.2 && proteinPct <= 0.3 && 
        carbsPct >= 0.35 && carbsPct <= 0.5 &&
        fatPct >= 0.2 && fatPct <= 0.35) {
      trendScore += 8;
    }
  }
  
  // Recent cook time trend
  const cookTimeTrend = patterns.recentTrends.cookTimePreference;
  if (cookTimeTrend === 'quick' && recipe.cookTime <= 20) {
    trendScore += 7;
  } else if (cookTimeTrend === 'moderate' && recipe.cookTime >= 21 && recipe.cookTime <= 40) {
    trendScore += 7;
  } else if (cookTimeTrend === 'slow' && recipe.cookTime >= 41) {
    trendScore += 7;
  }
  
  return Math.min(30, trendScore);
}

/**
 * Calculate success probability
 */
function calculateSuccessProbability(
  recipe: any,
  patterns: HistoricalPatterns
): number {
  if (patterns.preferredCuisines.size === 0) return 50; // No historical data
  
  let probability = 0;
  let factors = 0;
  
  // Base probability from cuisine engagement rate
  const cuisineEngagement = patterns.preferredCuisines.get(recipe.cuisine) || 0;
  probability += cuisineEngagement * 15;
  factors++;
  
  // Macro alignment probability
  const macroAlignment = calculateMacroAlignmentProbability(recipe, patterns.macroRanges);
  probability += macroAlignment * 10;
  factors++;
  
  // Cook time alignment probability
  const cookTimeAlignment = calculateCookTimeAlignmentProbability(recipe, patterns.cookTimeRange);
  probability += cookTimeAlignment * 5;
  factors++;
  
  return Math.round(probability);
}

/**
 * Calculate macro alignment probability
 */
function calculateMacroAlignmentProbability(
  recipe: any,
  macroRanges: HistoricalPatterns['macroRanges']
): number {
  if (macroRanges.calories.avg === 0) return 0.5;
  
  let alignment = 0;
  let factors = 0;
  
  // Check if within range for each macro
  if (recipe.calories >= macroRanges.calories.min && recipe.calories <= macroRanges.calories.max) {
    alignment += 1;
  } else {
    const avgDiff = Math.abs(recipe.calories - macroRanges.calories.avg);
    const range = macroRanges.calories.max - macroRanges.calories.min || 100;
    alignment += Math.max(0, 1 - avgDiff / range);
  }
  factors++;
  
  if (recipe.protein >= macroRanges.protein.min && recipe.protein <= macroRanges.protein.max) {
    alignment += 1;
  } else {
    const avgDiff = Math.abs(recipe.protein - macroRanges.protein.avg);
    const range = macroRanges.protein.max - macroRanges.protein.min || 20;
    alignment += Math.max(0, 1 - avgDiff / range);
  }
  factors++;
  
  return alignment / factors;
}

/**
 * Calculate cook time alignment probability
 */
function calculateCookTimeAlignmentProbability(
  recipe: any,
  cookTimeRange: HistoricalPatterns['cookTimeRange']
): number {
  if (cookTimeRange.avg === 0) return 0.5;
  
  if (recipe.cookTime >= cookTimeRange.min && recipe.cookTime <= cookTimeRange.max) {
    return 1.0;
  }
  
  const avgDiff = Math.abs(recipe.cookTime - cookTimeRange.avg);
  const range = cookTimeRange.max - cookTimeRange.min || 30;
  return Math.max(0, 1 - avgDiff / range);
}

/**
 * Analyze macro trend (high-protein, low-calorie, balanced, or none)
 */
function analyzeMacroTrend(
  recentRecipes: Array<{ protein: number; calories: number; carbs: number; fat: number }>,
  allRecipes: Array<{ protein: number; calories: number; carbs: number; fat: number }>
): 'high-protein' | 'low-calorie' | 'balanced' | 'none' {
  if (recentRecipes.length < 3) return 'none';
  
  const recentAvgProtein = recentRecipes.reduce((sum, r) => sum + r.protein, 0) / recentRecipes.length;
  const recentAvgCalories = recentRecipes.reduce((sum, r) => sum + r.calories, 0) / recentRecipes.length;
  const allAvgProtein = allRecipes.length > 0 ? 
    allRecipes.reduce((sum, r) => sum + r.protein, 0) / allRecipes.length : 0;
  const allAvgCalories = allRecipes.length > 0 ?
    allRecipes.reduce((sum, r) => sum + r.calories, 0) / allRecipes.length : 0;
  
  // High protein trend
  if (recentAvgProtein > allAvgProtein * 1.15 && recentAvgProtein >= 25) {
    return 'high-protein';
  }
  
  // Low calorie trend
  if (recentAvgCalories < allAvgCalories * 0.85 && recentAvgCalories <= 450) {
    return 'low-calorie';
  }
  
  // Check for balanced macros
  const balancedCount = recentRecipes.filter(r => {
    const totalCals = r.protein * 4 + r.carbs * 4 + r.fat * 9;
    if (totalCals === 0) return false;
    const proteinPct = (r.protein * 4) / totalCals;
    const carbsPct = (r.carbs * 4) / totalCals;
    const fatPct = (r.fat * 9) / totalCals;
    return proteinPct >= 0.2 && proteinPct <= 0.3 && 
           carbsPct >= 0.35 && carbsPct <= 0.5 &&
           fatPct >= 0.2 && fatPct <= 0.35;
  }).length;
  
  if (balancedCount / recentRecipes.length >= 0.6) {
    return 'balanced';
  }
  
  return 'none';
}

/**
 * Analyze cook time trend
 */
function analyzeCookTimeTrend(
  recentRecipes: Array<{ cookTime: number }>,
  allRecipes: Array<{ cookTime: number }>
): 'quick' | 'moderate' | 'slow' | 'none' {
  if (recentRecipes.length < 3) return 'none';
  
  const recentAvg = recentRecipes.reduce((sum, r) => sum + r.cookTime, 0) / recentRecipes.length;
  const allAvg = allRecipes.length > 0 ?
    allRecipes.reduce((sum, r) => sum + r.cookTime, 0) / allRecipes.length : 0;
  
  if (recentAvg <= 20 && recentAvg < allAvg * 0.9) {
    return 'quick';
  } else if (recentAvg >= 41 && recentAvg > allAvg * 1.1) {
    return 'slow';
  } else if (recentAvg >= 21 && recentAvg <= 40) {
    return 'moderate';
  }
  
  return 'none';
}

