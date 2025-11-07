// backend/src/utils/dynamicWeightAdjustment.ts
// Dynamic weight adjustment based on user behavior (Phase 6, Group 11)

import type { UserBehaviorData } from './behavioralScoring';

/**
 * Calculate scores for recipes the user has interacted with
 * This is used to determine which scoring factors correlate with user preferences
 */
export async function calculateHistoricalScores(
  userBehavior: UserBehaviorData,
  scoringContext: {
    userPreferences: any;
    macroGoals: any;
    physicalProfile: any;
    temporalContext: any;
    userTemporalPatterns: any;
    cookTimeContext: any;
    userKitchenProfile: any;
    userPrefsForScoring: any;
  }
): Promise<Array<{
  recipeId: string;
  discriminatoryScore: number;
  baseScore: number;
  healthGoalScore: number;
  behavioralScore: number;
  temporalScore: number;
  enhancedScore: number;
  externalScore: number;
}>> {
  // Get all unique recipe IDs from user interactions
  const interactedRecipeIds = new Set<string>();
  userBehavior.likedRecipes.forEach(r => interactedRecipeIds.add(r.recipeId));
  userBehavior.dislikedRecipes.forEach(r => interactedRecipeIds.add(r.recipeId));
  userBehavior.savedRecipes.forEach(r => interactedRecipeIds.add(r.recipeId));
  userBehavior.consumedRecipes.forEach(r => interactedRecipeIds.add(r.recipeId));
  
  if (interactedRecipeIds.size === 0) {
    return [];
  }
  
  // Import Prisma to fetch recipes
  const { prisma } = await import('@/lib/prisma');
  
  // Fetch all interacted recipes
  const recipes = await prisma.recipe.findMany({
    where: {
      id: { in: Array.from(interactedRecipeIds) }
    },
    include: {
      ingredients: { orderBy: { order: 'asc' } },
      instructions: { orderBy: { step: 'asc' } }
    }
  });
  
  // Import scoring functions
  const { calculateRecipeScore } = require('./scoring');
  const { calculateBehavioralScore } = require('./behavioralScoring');
  const { calculateTemporalScore } = require('./temporalScoring');
  const { calculateEnhancedScore } = require('./enhancedScoring');
  const { calculateDiscriminatoryScore } = require('./discriminatoryScoring');
  const { calculateExternalScore } = require('./externalScoring');
  const { calculateHealthGoalMatch } = require('./healthGoalScoring');
  
  // Calculate scores for each interacted recipe
  const historicalScores = recipes.map((recipe: any) => {
    const behavioralScore = calculateBehavioralScore(recipe, userBehavior);
    const temporalScore = calculateTemporalScore(recipe, scoringContext.temporalContext, scoringContext.userTemporalPatterns);
    const enhancedScore = calculateEnhancedScore(recipe, scoringContext.cookTimeContext, scoringContext.userKitchenProfile);
    const discriminatoryScore = scoringContext.userPrefsForScoring ? 
      calculateDiscriminatoryScore(recipe, scoringContext.userPrefsForScoring) : 
      { total: 50 };
    const externalScore = calculateExternalScore(recipe);
    const healthGoalScore = calculateHealthGoalMatch(
      recipe,
      scoringContext.physicalProfile?.fitnessGoal || null,
      scoringContext.macroGoals ? {
        calories: scoringContext.macroGoals.calories,
        protein: scoringContext.macroGoals.protein,
        carbs: scoringContext.macroGoals.carbs,
        fat: scoringContext.macroGoals.fat
      } : null
    );
    const baseScore = calculateRecipeScore(
      recipe,
      scoringContext.userPreferences,
      scoringContext.macroGoals,
      behavioralScore.total,
      temporalScore.total
    );
    
    return {
      recipeId: recipe.id,
      discriminatoryScore: discriminatoryScore.total,
      baseScore: baseScore.total,
      healthGoalScore: healthGoalScore.total,
      behavioralScore: behavioralScore.total,
      temporalScore: temporalScore.total,
      enhancedScore: enhancedScore.total,
      externalScore: externalScore.total,
    };
  });
  
  return historicalScores;
}

export interface ScoringWeights {
  discriminatoryWeight: number;      // Weight for discriminatory score
  baseScoreWeight: number;            // Weight for base score (macro + taste)
  healthGoalWeight: number;           // Weight for health goal score
  behavioralWeight: number;          // Weight for behavioral score
  temporalWeight: number;             // Weight for temporal score
  enhancedWeight: number;             // Weight for enhanced score
  externalWeight: number;             // Weight for external score
}

export interface WeightAdjustmentResult {
  weights: ScoringWeights;
  confidence: number;                 // How confident we are in these weights (0-1)
  sampleSize: number;                 // Number of interactions used
  factorCorrelations: {
    discriminatory: number;
    baseScore: number;
    healthGoal: number;
    behavioral: number;
    temporal: number;
    enhanced: number;
    external: number;
  };
}

/**
 * Default weights (used when insufficient data)
 * Note: These are for internal score calculation only (discriminatory, baseScore, healthGoal)
 * Other weights (behavioral, temporal, enhanced, external) are used elsewhere
 */
const DEFAULT_WEIGHTS: ScoringWeights = {
  discriminatoryWeight: 0.60,
  baseScoreWeight: 0.25,
  healthGoalWeight: 0.15,
  behavioralWeight: 0.15,
  temporalWeight: 0.10,
  enhancedWeight: 0.10,
  externalWeight: 0.05,
};

// Normalize default weights for internal score calculation (must sum to 1.0)
const INTERNAL_SCORE_DEFAULT_WEIGHTS = {
  discriminatoryWeight: 0.60,
  baseScoreWeight: 0.25,
  healthGoalWeight: 0.15,
};

/**
 * Calculate optimal scoring weights based on user behavior
 */
export function calculateOptimalWeights(
  userBehavior: UserBehaviorData,
  recipeScores: Array<{
    recipeId: string;
    discriminatoryScore: number;
    baseScore: number;
    healthGoalScore: number;
    behavioralScore: number;
    temporalScore: number;
    enhancedScore: number;
    externalScore: number;
  }>
): WeightAdjustmentResult {
  // Combine positive interactions (liked, saved, consumed)
  const positiveRecipeIds = new Set<string>();
  
  userBehavior.likedRecipes.forEach(r => positiveRecipeIds.add(r.recipeId));
  userBehavior.savedRecipes.forEach(r => positiveRecipeIds.add(r.recipeId));
  userBehavior.consumedRecipes.forEach(r => positiveRecipeIds.add(r.recipeId));
  
  // Combine negative interactions (disliked)
  const negativeRecipeIds = new Set<string>();
  userBehavior.dislikedRecipes.forEach(r => negativeRecipeIds.add(r.recipeId));
  
  // Need minimum sample size to make meaningful adjustments
  const minSampleSize = 10;
  const totalInteractions = positiveRecipeIds.size + negativeRecipeIds.size;
  
  if (totalInteractions < minSampleSize || recipeScores.length === 0) {
    // Not enough data - return default weights with low confidence
    const confidenceValue = totalInteractions === 0 ? 0 : Math.min(0.29, totalInteractions / minSampleSize);
    return {
      weights: {
        ...DEFAULT_WEIGHTS,
        discriminatoryWeight: INTERNAL_SCORE_DEFAULT_WEIGHTS.discriminatoryWeight,
        baseScoreWeight: INTERNAL_SCORE_DEFAULT_WEIGHTS.baseScoreWeight,
        healthGoalWeight: INTERNAL_SCORE_DEFAULT_WEIGHTS.healthGoalWeight,
      },
      confidence: confidenceValue,
      sampleSize: totalInteractions,
      factorCorrelations: {
        discriminatory: 0,
        baseScore: 0,
        healthGoal: 0,
        behavioral: 0,
        temporal: 0,
        enhanced: 0,
        external: 0,
      },
    };
  }
  
  // Calculate correlation between each scoring factor and user engagement
  const correlations = calculateFactorCorrelations(
    recipeScores,
    positiveRecipeIds,
    negativeRecipeIds
  );
  
  // Calculate optimal weights based on correlations
  const weights = calculateWeightsFromCorrelations(correlations);
  
  // Calculate confidence based on sample size and correlation strength
  const confidence = calculateConfidence(totalInteractions, correlations);
  
  return {
    weights,
    confidence,
    sampleSize: totalInteractions,
    factorCorrelations: correlations,
  };
}

/**
 * Calculate correlation between each scoring factor and user engagement
 */
function calculateFactorCorrelations(
  recipeScores: Array<{
    recipeId: string;
    discriminatoryScore: number;
    baseScore: number;
    healthGoalScore: number;
    behavioralScore: number;
    temporalScore: number;
    enhancedScore: number;
    externalScore: number;
  }>,
  positiveRecipeIds: Set<string>,
  negativeRecipeIds: Set<string>
): {
  discriminatory: number;
  baseScore: number;
  healthGoal: number;
  behavioral: number;
  temporal: number;
  enhanced: number;
  external: number;
} {
  // Calculate average scores for positive and negative recipes
  const positiveScores = {
    discriminatory: [] as number[],
    baseScore: [] as number[],
    healthGoal: [] as number[],
    behavioral: [] as number[],
    temporal: [] as number[],
    enhanced: [] as number[],
    external: [] as number[],
  };
  
  const negativeScores = {
    discriminatory: [] as number[],
    baseScore: [] as number[],
    healthGoal: [] as number[],
    behavioral: [] as number[],
    temporal: [] as number[],
    enhanced: [] as number[],
    external: [] as number[],
  };
  
  // Collect scores for positive and negative recipes
  recipeScores.forEach(score => {
    if (positiveRecipeIds.has(score.recipeId)) {
      positiveScores.discriminatory.push(score.discriminatoryScore);
      positiveScores.baseScore.push(score.baseScore);
      positiveScores.healthGoal.push(score.healthGoalScore);
      positiveScores.behavioral.push(score.behavioralScore);
      positiveScores.temporal.push(score.temporalScore);
      positiveScores.enhanced.push(score.enhancedScore);
      positiveScores.external.push(score.externalScore);
    } else if (negativeRecipeIds.has(score.recipeId)) {
      negativeScores.discriminatory.push(score.discriminatoryScore);
      negativeScores.baseScore.push(score.baseScore);
      negativeScores.healthGoal.push(score.healthGoalScore);
      negativeScores.behavioral.push(score.behavioralScore);
      negativeScores.temporal.push(score.temporalScore);
      negativeScores.enhanced.push(score.enhancedScore);
      negativeScores.external.push(score.externalScore);
    }
  });
  
  // Calculate correlation (difference between positive and negative averages)
  // Higher positive correlation = better predictor of user preference
  const calculateCorrelation = (positive: number[], negative: number[]): number => {
    if (positive.length === 0 || negative.length === 0) return 0;
    
    const avgPositive = positive.reduce((a, b) => a + b, 0) / positive.length;
    const avgNegative = negative.reduce((a, b) => a + b, 0) / negative.length;
    
    // Normalize to -1 to 1 range
    const diff = (avgPositive - avgNegative) / 100;
    return Math.max(-1, Math.min(1, diff));
  };
  
  return {
    discriminatory: calculateCorrelation(positiveScores.discriminatory, negativeScores.discriminatory),
    baseScore: calculateCorrelation(positiveScores.baseScore, negativeScores.baseScore),
    healthGoal: calculateCorrelation(positiveScores.healthGoal, negativeScores.healthGoal),
    behavioral: calculateCorrelation(positiveScores.behavioral, negativeScores.behavioral),
    temporal: calculateCorrelation(positiveScores.temporal, negativeScores.temporal),
    enhanced: calculateCorrelation(positiveScores.enhanced, negativeScores.enhanced),
    external: calculateCorrelation(positiveScores.external, negativeScores.external),
  };
}

/**
 * Calculate optimal weights from factor correlations
 */
function calculateWeightsFromCorrelations(correlations: {
  discriminatory: number;
  baseScore: number;
  healthGoal: number;
  behavioral: number;
  temporal: number;
  enhanced: number;
  external: number;
}): ScoringWeights {
  // Convert correlations to weights
  // For internal score calculation, we only use: discriminatory, baseScore, healthGoal
  // These must sum to 1.0
  const defaultBaselines = {
    discriminatory: INTERNAL_SCORE_DEFAULT_WEIGHTS.discriminatoryWeight,
    baseScore: INTERNAL_SCORE_DEFAULT_WEIGHTS.baseScoreWeight,
    healthGoal: INTERNAL_SCORE_DEFAULT_WEIGHTS.healthGoalWeight,
  };
  
  // Adjust weights based on correlations (positive correlation = increase weight)
  const rawWeights = {
    discriminatory: Math.max(0.1, defaultBaselines.discriminatory * (1 + correlations.discriminatory * 0.5)),
    baseScore: Math.max(0.1, defaultBaselines.baseScore * (1 + correlations.baseScore * 0.5)),
    healthGoal: Math.max(0.1, defaultBaselines.healthGoal * (1 + correlations.healthGoal * 0.5)),
  };
  
  // Normalize weights to sum to 1.0
  const total = Object.values(rawWeights).reduce((a, b) => a + b, 0);
  
  if (total === 0 || !isFinite(total)) {
    // Fallback to defaults if all weights are zero or invalid
    return {
      ...DEFAULT_WEIGHTS,
      discriminatoryWeight: INTERNAL_SCORE_DEFAULT_WEIGHTS.discriminatoryWeight,
      baseScoreWeight: INTERNAL_SCORE_DEFAULT_WEIGHTS.baseScoreWeight,
      healthGoalWeight: INTERNAL_SCORE_DEFAULT_WEIGHTS.healthGoalWeight,
    };
  }
  
  // Normalize to sum to 1.0 for internal score weights
  const normalizedInternalWeights = {
    discriminatoryWeight: rawWeights.discriminatory / total,
    baseScoreWeight: rawWeights.baseScore / total,
    healthGoalWeight: rawWeights.healthGoal / total,
  };
  
  return {
    ...normalizedInternalWeights,
    behavioralWeight: DEFAULT_WEIGHTS.behavioralWeight,
    temporalWeight: DEFAULT_WEIGHTS.temporalWeight,
    enhancedWeight: DEFAULT_WEIGHTS.enhancedWeight,
    externalWeight: DEFAULT_WEIGHTS.externalWeight,
  };
}

/**
 * Calculate confidence in the weight adjustments
 */
function calculateConfidence(
  sampleSize: number,
  correlations: {
    discriminatory: number;
    baseScore: number;
    healthGoal: number;
    behavioral: number;
    temporal: number;
    enhanced: number;
    external: number;
  }
): number {
  // Confidence based on:
  // 1. Sample size (more data = more confidence)
  // 2. Correlation strength (stronger correlations = more confidence)
  
  const minSampleSize = 10;
  const optimalSampleSize = 50;
  const sampleSizeFactor = Math.min(1, (sampleSize - minSampleSize) / (optimalSampleSize - minSampleSize));
  
  // Average absolute correlation strength
  const avgCorrelationStrength = Math.abs(
    (correlations.discriminatory +
     correlations.baseScore +
     correlations.healthGoal +
     correlations.behavioral +
     correlations.temporal +
     correlations.enhanced +
     correlations.external) / 7
  );
  
  // Combined confidence (both factors matter)
  const confidence = (sampleSizeFactor * 0.6 + avgCorrelationStrength * 0.4);
  
  return Math.max(0.1, Math.min(1, confidence));
}

/**
 * Blend default weights with user-specific weights based on confidence
 */
export function blendWeights(
  defaultWeights: ScoringWeights,
  userWeights: ScoringWeights,
  confidence: number
): ScoringWeights {
  // Blend weights: confidence determines how much to use user-specific weights
  // Low confidence = use mostly defaults, high confidence = use mostly user weights
  
  return {
    discriminatoryWeight: defaultWeights.discriminatoryWeight * (1 - confidence) +
                          userWeights.discriminatoryWeight * confidence,
    baseScoreWeight: defaultWeights.baseScoreWeight * (1 - confidence) +
                     userWeights.baseScoreWeight * confidence,
    healthGoalWeight: defaultWeights.healthGoalWeight * (1 - confidence) +
                      userWeights.healthGoalWeight * confidence,
    behavioralWeight: defaultWeights.behavioralWeight * (1 - confidence) +
                       userWeights.behavioralWeight * confidence,
    temporalWeight: defaultWeights.temporalWeight * (1 - confidence) +
                     userWeights.temporalWeight * confidence,
    enhancedWeight: defaultWeights.enhancedWeight * (1 - confidence) +
                    userWeights.enhancedWeight * confidence,
    externalWeight: defaultWeights.externalWeight * (1 - confidence) +
                    userWeights.externalWeight * confidence,
  };
}

/**
 * Get optimal weights for a user, blending defaults with learned weights
 */
export function getOptimalWeights(
  userBehavior: UserBehaviorData,
  recipeScores: Array<{
    recipeId: string;
    discriminatoryScore: number;
    baseScore: number;
    healthGoalScore: number;
    behavioralScore: number;
    temporalScore: number;
    enhancedScore: number;
    externalScore: number;
  }>
): ScoringWeights {
  const adjustmentResult = calculateOptimalWeights(userBehavior, recipeScores);
  
  // Blend with defaults based on confidence
  return blendWeights(DEFAULT_WEIGHTS, adjustmentResult.weights, adjustmentResult.confidence);
}

