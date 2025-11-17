/**
 * Calculate batch cooking time estimates for meal prep
 * 
 * Batch cooking time doesn't scale linearly. Factors:
 * - Prep time (chopping, mixing) scales more linearly
 * - Active cooking time (stirring, monitoring) scales moderately
 * - Passive cooking time (baking, simmering) scales minimally
 * - Efficiency gains from batch cooking (parallel tasks)
 */

export interface BatchCookingTimeEstimate {
  originalTime: number; // Original recipe cook time in minutes
  estimatedTime: number; // Estimated batch cooking time in minutes
  scaleFactor: number; // How many times the recipe is scaled
  breakdown: {
    prepTime: number; // Estimated prep time
    activeCookingTime: number; // Active cooking time
    passiveCookingTime: number; // Passive cooking time (baking, simmering)
  };
  efficiencyGain: number; // Percentage of time saved due to batch efficiency
  tips: string[]; // Tips for optimizing batch cooking time
}

/**
 * Estimate batch cooking time based on recipe scaling
 */
export function estimateBatchCookingTime(
  originalCookTime: number,
  originalServings: number,
  scaledServings: number,
  recipeDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
): BatchCookingTimeEstimate {
  const scaleFactor = scaledServings / originalServings;
  
  // Base time breakdown (rough estimates based on typical recipes)
  // For most recipes:
  // - 30% prep time (scales linearly)
  // - 40% active cooking (scales moderately, ~70% efficiency)
  // - 30% passive cooking (scales minimally, ~30% efficiency)
  
  const basePrepRatio = 0.30;
  const baseActiveRatio = 0.40;
  const basePassiveRatio = 0.30;
  
  // Adjust ratios based on difficulty
  // Harder recipes tend to have more prep and active time
  let prepRatio = basePrepRatio;
  let activeRatio = baseActiveRatio;
  let passiveRatio = basePassiveRatio;
  
  if (recipeDifficulty === 'easy') {
    prepRatio = 0.20;
    activeRatio = 0.30;
    passiveRatio = 0.50; // More passive cooking for easy recipes
  } else if (recipeDifficulty === 'hard') {
    prepRatio = 0.40;
    activeRatio = 0.50;
    passiveRatio = 0.10; // Less passive cooking for hard recipes
  }
  
  // Calculate original time breakdown
  const originalPrepTime = originalCookTime * prepRatio;
  const originalActiveTime = originalCookTime * activeRatio;
  const originalPassiveTime = originalCookTime * passiveRatio;
  
  // Scaling factors for each type of time
  // Prep time scales more linearly (80% efficiency for batch)
  const prepScalingFactor = 0.80;
  
  // Active cooking scales moderately (65% efficiency - can do some things in parallel)
  const activeScalingFactor = 0.65;
  
  // Passive cooking scales minimally (20% efficiency - same oven/stove time)
  const passiveScalingFactor = 0.20;
  
  // Calculate scaled times
  const scaledPrepTime = originalPrepTime * scaleFactor * prepScalingFactor;
  const scaledActiveTime = originalActiveTime * scaleFactor * activeScalingFactor;
  const scaledPassiveTime = originalPassiveTime * Math.max(1, scaleFactor * passiveScalingFactor);
  
  // Total estimated time
  const estimatedTime = Math.round(
    scaledPrepTime + scaledActiveTime + scaledPassiveTime
  );
  
  // Calculate efficiency gain
  const linearTime = originalCookTime * scaleFactor;
  const efficiencyGain = ((linearTime - estimatedTime) / linearTime) * 100;
  
  // Generate tips based on scale factor and recipe characteristics
  const tips: string[] = [];
  
  if (scaleFactor >= 3) {
    tips.push('Large batch - consider using multiple pans/ovens to save time');
    tips.push('Prep all ingredients before starting to cook');
  }
  
  if (scaleFactor >= 2) {
    tips.push('Batch cooking saves time - prep work can be done in one go');
  }
  
  if (passiveRatio > 0.3) {
    tips.push('Most cooking is passive - perfect for batch prep!');
  }
  
  if (activeRatio > 0.4) {
    tips.push('This recipe requires active attention - monitor closely during batch cooking');
  }
  
  if (scaleFactor >= 4) {
    tips.push('Very large batch - allow extra time for organization and storage');
  }
  
  // Add buffer time for very large batches (organization, cleanup)
  let finalEstimatedTime = estimatedTime;
  if (scaleFactor >= 5) {
    finalEstimatedTime += 15; // Extra 15 minutes for very large batches
    tips.push('Add 15 minutes for organization and cleanup');
  } else if (scaleFactor >= 3) {
    finalEstimatedTime += 10; // Extra 10 minutes for large batches
    tips.push('Add 10 minutes for organization and cleanup');
  }
  
  return {
    originalTime: originalCookTime,
    estimatedTime: finalEstimatedTime,
    scaleFactor,
    breakdown: {
      prepTime: Math.round(scaledPrepTime),
      activeCookingTime: Math.round(scaledActiveTime),
      passiveCookingTime: Math.round(scaledPassiveTime),
    },
    efficiencyGain: Math.round(efficiencyGain * 10) / 10,
    tips,
  };
}

/**
 * Format time estimate for display
 */
export function formatTimeEstimate(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours} hr${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min`;
}

/**
 * Get time savings message
 */
export function getTimeSavingsMessage(estimate: BatchCookingTimeEstimate): string {
  const linearTime = estimate.originalTime * estimate.scaleFactor;
  const saved = linearTime - estimate.estimatedTime;
  
  if (saved <= 0) {
    return 'Batch cooking time is similar to cooking multiple times';
  }
  
  const savedPercent = Math.round((saved / linearTime) * 100);
  return `Saves ~${formatTimeEstimate(saved)} (${savedPercent}% efficiency gain)`;
}

