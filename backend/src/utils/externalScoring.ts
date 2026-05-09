// backend/src/utils/externalScoring.ts

/**
 * External Recipe Scoring Module (Phase 5)
 * 
 * This module calculates scores based on external data from APIs like Spoonacular.
 * It considers quality ratings, popularity metrics, and health scores from external sources.
 */

export interface ExternalScoringResult {
  total: number;
  breakdown: {
    qualityScore: number;
    popularityScore: number;
    healthScore: number;
    recencyBonus: number;
  };
  hasExternalData: boolean;
}

/**
 * Calculate external scoring based on API data
 * 
 * @param recipe Recipe with external data fields
 * @returns External scoring result
 */
export function calculateExternalScore(recipe: any): ExternalScoringResult {
  // Check if recipe has external data
  const hasExternalData = !!recipe.externalId && !!recipe.externalSource;

  // If no external data, return neutral score
  if (!hasExternalData) {
    return {
      total: 50, // Neutral score for recipes without external data
      breakdown: {
        qualityScore: 50,
        popularityScore: 50,
        healthScore: 50,
        recencyBonus: 0,
      },
      hasExternalData: false,
    };
  }

  // Quality Score (0-100) - weight: 40%
  // Based on the recipe's quality rating from external source
  const qualityScore = recipe.qualityScore ?? 50;

  // Popularity Score (0-100) - weight: 30%
  // Based on how popular the recipe is (likes, views, etc.)
  const popularityScore = recipe.popularityScore ?? 50;

  // Health Score (0-100) - weight: 25%
  // Based on nutritional quality from external source
  const healthScore = recipe.healthScore ?? 50;

  // Recency Bonus (0-5 points) - weight: 5%
  // Boost recipes that were recently enriched (data is fresh)
  let recencyBonus = 0;
  if (recipe.lastEnriched) {
    const daysSinceEnriched = Math.floor(
      (Date.now() - new Date(recipe.lastEnriched).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceEnriched <= 7) {
      recencyBonus = 5; // Very fresh data
    } else if (daysSinceEnriched <= 30) {
      recencyBonus = 3; // Fresh data
    } else if (daysSinceEnriched <= 90) {
      recencyBonus = 1; // Somewhat fresh
    }
    // No bonus after 90 days
  }

  // Calculate total weighted score
  const total = Math.round(
    qualityScore * 0.4 +
    popularityScore * 0.3 +
    healthScore * 0.25 +
    recencyBonus
  );

  return {
    total: Math.min(100, Math.max(0, total)), // Clamp to 0-100
    breakdown: {
      qualityScore,
      popularityScore,
      healthScore,
      recencyBonus,
    },
    hasExternalData: true,
  };
}

/**
 * Calculate a hybrid score combining internal and external data
 * 
 * This function blends the existing scoring algorithms with external data
 * to create a more comprehensive recommendation score.
 * 
 * @param internalScore Score from internal algorithms (0-100)
 * @param externalScore Score from external data (0-100)
 * @param hasExternalData Whether the recipe has external enrichment data
 * @returns Hybrid score (0-100)
 */
export function calculateHybridScore(
  internalScore: number,
  externalScore: number,
  hasExternalData: boolean
): number {
  if (!hasExternalData) {
    // If no external data, rely entirely on internal scoring
    return internalScore;
  }

  // Weight distribution:
  // - 60% internal scoring (user preferences, behavioral, temporal, etc.)
  // - 40% external scoring (quality, popularity, health)
  const hybridScore = Math.round(
    internalScore * 0.6 +
    externalScore * 0.4
  );

  return Math.min(100, Math.max(0, hybridScore));
}

