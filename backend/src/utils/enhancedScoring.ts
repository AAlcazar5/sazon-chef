// backend/src/utils/enhancedScoring.ts

export interface CookTimeContext {
  availableTime: number; // minutes available for cooking
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: 'weekday' | 'weekend';
  urgency: 'low' | 'medium' | 'high';
}

export interface EnhancedScore {
  cookTimeScore: number;
  convenienceScore: number;
  total: number;
  breakdown: {
    cookTimeMatch: number;
    convenienceFactor: number;
    timeEfficiency: number;
  };
}

export interface UserKitchenProfile {
  cookingSkill: 'beginner' | 'intermediate' | 'advanced';
  preferredCookTime: number; // preferred maximum cook time in minutes
  kitchenEquipment: string[]; // available equipment
  dietaryRestrictions: string[];
  budget: 'low' | 'medium' | 'high';
}

export function calculateEnhancedScore(
  recipe: any,
  cookTimeContext: CookTimeContext,
  userKitchenProfile: UserKitchenProfile
): EnhancedScore {
  // 1. Cook Time Matching (Weight: 60%)
  const cookTimeScore = calculateCookTimeScore(recipe.cookTime, cookTimeContext, userKitchenProfile.preferredCookTime);

  // 2. Convenience Factor (Weight: 30%)
  const convenienceScore = calculateConvenienceScore(recipe, userKitchenProfile);

  // 3. Time Efficiency (Weight: 10%)
  const timeEfficiency = calculateTimeEfficiency(recipe.cookTime, cookTimeContext.availableTime);

  const total = Math.round(
    cookTimeScore * 0.6 +
    convenienceScore * 0.3 +
    timeEfficiency * 0.1
  );

  return {
    cookTimeScore: Math.round(cookTimeScore),
    convenienceScore: Math.round(convenienceScore),
    total: Math.round(total),
    breakdown: {
      cookTimeMatch: Math.round(cookTimeScore),
      convenienceFactor: Math.round(convenienceScore),
      timeEfficiency: Math.round(timeEfficiency)
    }
  };
}

function calculateCookTimeScore(
  recipeCookTime: number,
  context: CookTimeContext,
  preferredCookTime: number
): number {
  let score = 0;

  // Base score based on matching preferred cook time
  const diffFromPreferred = Math.abs(recipeCookTime - preferredCookTime);
  score = Math.max(0, 100 - (diffFromPreferred * 2)); // 2 points penalty per minute difference

  // Adjust based on available time
  const diffFromAvailable = Math.abs(recipeCookTime - context.availableTime);
  if (recipeCookTime <= context.availableTime) {
    score = Math.max(score, 100 - (diffFromAvailable * 1)); // Smaller penalty if within available time
  } else {
    score = Math.min(score, 100 - (diffFromAvailable * 3)); // Larger penalty if exceeds available time
  }

  // Contextual adjustments
  if (context.urgency === 'high' && recipeCookTime > 20) {
    score -= 20; // Penalize longer recipes for high urgency
  } else if (context.urgency === 'low' && recipeCookTime < 15) {
    score -= 10; // Slightly penalize very quick recipes if user has more time
  }

  if (context.timeOfDay === 'morning' && recipeCookTime > 30) {
    score -= 15; // Breakfasts usually need to be quicker
  }
  if (context.dayOfWeek === 'weekday' && recipeCookTime > 45) {
    score -= 10; // Weekday dinners often need to be faster
  }

  return Math.max(0, Math.min(100, score));
}

function calculateConvenienceScore(
  recipe: any,
  userProfile: UserKitchenProfile
): number {
  let score = 100;

  // Skill level matching
  if (userProfile.cookingSkill === 'beginner') {
    if (recipe.cookTime > 45 || recipe.ingredients?.length > 10) {
      score -= 20; // Penalize complex recipes for beginners
    } else if (recipe.cookTime < 20 && recipe.ingredients?.length < 6) {
      score += 10; // Bonus for very easy recipes for beginners
    }
  } else if (userProfile.cookingSkill === 'advanced') {
    if (recipe.cookTime < 15 && recipe.ingredients?.length < 5) {
      score -= 5; // Slightly penalize overly simple recipes for advanced cooks
    }
  }

  // Equipment availability (simplified: check for basic equipment)
  const requiredEquipment = ['oven', 'stovetop', 'knife', 'cutting board']; // Example basic equipment
  const missingEquipment = requiredEquipment.filter(eq => !userProfile.kitchenEquipment.includes(eq));
  if (missingEquipment.length > 0) {
    score -= (missingEquipment.length * 5); // Small penalty for missing basic equipment
  }

  // Dietary restrictions (placeholder - actual implementation would be more complex)
  if (userProfile.dietaryRestrictions.length > 0) {
    // This would involve checking recipe tags against user restrictions
    // For now, assume neutral or slight penalty if not explicitly matched
    score -= 5;
  }

  // Budget consideration (placeholder)
  // This would involve estimating recipe cost and comparing to user budget
  // For now, assume neutral
  if (userProfile.budget === 'low' && recipe.calories > 600) { // Example: high calorie might imply higher cost
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateTimeEfficiency(recipeCookTime: number, availableTime: number): number {
  if (availableTime <= 0) return 0; // Cannot calculate efficiency if no time available

  if (recipeCookTime <= availableTime) {
    // If recipe fits within available time, score based on how much of the available time it uses
    // Max score if it uses most of the time, but not too much overhead
    return Math.round((recipeCookTime / availableTime) * 100);
  } else {
    // If recipe exceeds available time, penalize heavily
    const excessTime = recipeCookTime - availableTime;
    return Math.max(0, 100 - (excessTime * 5)); // 5 points penalty per minute over
  }
}