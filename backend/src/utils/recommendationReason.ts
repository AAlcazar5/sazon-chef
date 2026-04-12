// backend/src/utils/recommendationReason.ts
// Generates a human-readable explanation for why a recipe was recommended

export interface ScoreBreakdown {
  discriminatoryScore?: number;
  macroScore?: number;
  tasteScore?: number;
  healthGoalScore?: number;
  behavioralScore?: number;
  temporalScore?: number;
  healthGrade?: string;
  healthGradeScore?: number;
}

export interface RecommendationContext {
  recipe: {
    cuisine: string;
    cookTime: number;
    protein: number;
    calories: number;
    mealType?: string | null;
  };
  scoreBreakdown: ScoreBreakdown;
  likedCuisines?: string[];
  fitnessGoal?: string | null;
  isWeekend?: boolean;
  mealPeriod?: string;
}

export function generateRecommendationReason(ctx: RecommendationContext): string {
  const { recipe, scoreBreakdown, likedCuisines = [], fitnessGoal, isWeekend, mealPeriod } = ctx;

  // Collect candidate reasons scored by their relevance
  const candidates: Array<{ score: number; reason: string }> = [];

  // Cuisine match — user explicitly likes this cuisine
  const cuisineLower = (recipe.cuisine || '').toLowerCase();
  const likedLower = likedCuisines.map(c => c.toLowerCase());
  if (likedLower.includes(cuisineLower)) {
    candidates.push({
      score: 90,
      reason: `You love ${recipe.cuisine} food`,
    });
  }

  // High protein for muscle gain goal
  if (fitnessGoal === 'gain_muscle' && recipe.protein >= 30) {
    candidates.push({
      score: 85,
      reason: `High protein (${recipe.protein}g) for your muscle gain goal`,
    });
  }

  // Low cal for weight loss goal
  if (fitnessGoal === 'lose_weight' && recipe.calories <= 450) {
    candidates.push({
      score: 85,
      reason: `Light at ${recipe.calories} cal — great for your goals`,
    });
  }

  // Quick cook time
  if (recipe.cookTime <= 20) {
    candidates.push({
      score: 70,
      reason: `Ready in just ${recipe.cookTime} min`,
    });
  }

  // Weekend adventure — try something new
  if (isWeekend && !likedLower.includes(cuisineLower) && (scoreBreakdown.tasteScore || 0) >= 60) {
    candidates.push({
      score: 75,
      reason: `Weekend adventure — try ${recipe.cuisine}!`,
    });
  }

  // Strong macro match
  if ((scoreBreakdown.macroScore || 0) >= 80) {
    candidates.push({
      score: 65,
      reason: 'Fits your macros perfectly',
    });
  }

  // Health grade A
  if (scoreBreakdown.healthGrade === 'A') {
    candidates.push({
      score: 60,
      reason: 'Top-rated for nutrition',
    });
  }

  // High behavioral score — user's past behavior aligns
  if ((scoreBreakdown.behavioralScore || 0) >= 70) {
    candidates.push({
      score: 80,
      reason: "Based on recipes you've enjoyed",
    });
  }

  // Temporal match
  if ((scoreBreakdown.temporalScore || 0) >= 70 && mealPeriod) {
    const periodLabel = mealPeriod === 'breakfast' ? 'morning' :
                        mealPeriod === 'lunch' ? 'afternoon' :
                        mealPeriod === 'dinner' ? 'evening' : mealPeriod;
    candidates.push({
      score: 55,
      reason: `Perfect for your ${periodLabel}`,
    });
  }

  // Sort by score descending and pick the best
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    return candidates[0].reason;
  }

  // Generic fallback
  return 'Picked for you by Sazon';
}
