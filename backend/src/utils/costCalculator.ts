// backend/src/utils/costCalculator.ts
// Utilities for calculating recipe costs and budget filtering

import { prisma } from '../lib/prisma';

export interface CostCalculationResult {
  estimatedCost: number;
  estimatedCostPerServing: number;
  costSource: 'calculated' | 'user' | 'api' | 'estimated';
  breakdown?: Array<{
    ingredient: string;
    quantity: string;
    unitCost: number;
    totalCost: number;
  }>;
}

/**
 * Calculate recipe cost based on ingredient prices
 */
export async function calculateRecipeCost(
  recipeId: string,
  userId?: string
): Promise<CostCalculationResult> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: true,
    },
  });

  if (!recipe) {
    throw new Error('Recipe not found');
  }

  // If recipe already has cost from API, use that
  if (recipe.pricePerServing) {
    return {
      estimatedCost: recipe.pricePerServing * recipe.servings,
      estimatedCostPerServing: recipe.pricePerServing,
      costSource: 'api',
    };
  }

  // If recipe has user-provided cost, use that
  if (recipe.estimatedCost) {
    return {
      estimatedCost: recipe.estimatedCost,
      estimatedCostPerServing: recipe.estimatedCostPerServing || recipe.estimatedCost / recipe.servings,
      costSource: 'user',
    };
  }

  // Calculate from ingredient costs
  let totalCost = 0;
  const breakdown: Array<{
    ingredient: string;
    quantity: string;
    unitCost: number;
    totalCost: number;
  }> = [];

  if (userId) {
    // Get user's ingredient costs
    const ingredientCosts = await prisma.ingredientCost.findMany({
      where: { userId },
    });

    const costMap = new Map(
      ingredientCosts.map((ic) => [ic.ingredientName.toLowerCase(), ic])
    );

    for (const ingredient of recipe.ingredients) {
      const text = ingredient.text.toLowerCase();
      
      // Try to match ingredient name in cost database
      let matchedCost = null;
      for (const [name, cost] of costMap.entries()) {
        if (text.includes(name) || name.includes(text.split(' ').pop() || '')) {
          matchedCost = cost;
          break;
        }
      }

      if (matchedCost) {
        // Parse quantity from ingredient text (e.g., "2 cups flour")
        const quantityMatch = ingredient.text.match(/^(\d+(?:\/\d+)?(?:\s+\d+\/\d+)?)\s*(.+)$/i);
        let quantity = 1;
        let unit = 'piece';

        if (quantityMatch) {
          const qtyText = quantityMatch[1].trim();
          // Simple quantity parsing (could be improved)
          const numMatch = qtyText.match(/(\d+(?:\/\d+)?)/);
          if (numMatch) {
            const [num, den] = numMatch[1].split('/').map(Number);
            quantity = den ? num / den : num;
          }

          // Try to extract unit
          const unitText = quantityMatch[2].toLowerCase();
          if (unitText.includes('cup')) unit = 'cup';
          else if (unitText.includes('lb') || unitText.includes('pound')) unit = 'lb';
          else if (unitText.includes('oz')) unit = 'oz';
          else if (unitText.includes('piece') || unitText.includes('item')) unit = 'piece';
        }

        // Convert to cost
        let ingredientCost = 0;
        if (matchedCost.unit === unit) {
          ingredientCost = matchedCost.unitCost * quantity;
        } else {
          // Simple unit conversion (could be improved with proper conversion rates)
          ingredientCost = matchedCost.unitCost * quantity * 0.5; // Rough estimate
        }

        totalCost += ingredientCost;
        breakdown.push({
          ingredient: ingredient.text,
          quantity: quantityMatch ? quantityMatch[1] : '1',
          unitCost: matchedCost.unitCost,
          totalCost: ingredientCost,
        });
      }
    }
  }

  // If we have calculated costs, use them
  if (totalCost > 0) {
    return {
      estimatedCost: totalCost,
      estimatedCostPerServing: totalCost / recipe.servings,
      costSource: 'calculated',
      breakdown,
    };
  }

  // Fallback: estimate based on recipe complexity
  // Rough estimates: $5-10 per serving for simple, $10-20 for medium, $20+ for complex
  const baseCostPerServing = recipe.difficulty === 'easy' ? 7 : recipe.difficulty === 'medium' ? 15 : 25;
  const estimatedCost = baseCostPerServing * recipe.servings;

  return {
    estimatedCost,
    estimatedCostPerServing: baseCostPerServing,
    costSource: 'estimated',
  };
}

/**
 * Check if recipe cost is within budget
 */
export function isWithinBudget(
  recipeCost: number,
  userPreferences?: {
    maxRecipeCost?: number | null;
    maxMealCost?: number | null;
    maxDailyFoodBudget?: number | null;
  }
): boolean {
  if (!userPreferences) return true;

  if (userPreferences.maxRecipeCost && recipeCost > userPreferences.maxRecipeCost) {
    return false;
  }

  if (userPreferences.maxMealCost && recipeCost > userPreferences.maxMealCost) {
    return false;
  }

  return true;
}

/**
 * Calculate cost score for recipe recommendations (0-100)
 * Higher score = better value (lower cost relative to nutrition/quality)
 */
export function calculateCostScore(
  recipeCost: number,
  recipeCalories: number,
  userPreferences?: {
    maxRecipeCost?: number | null;
    maxMealCost?: number | null;
    maxDailyFoodBudget?: number | null;
  }
): number {
  // If no budget constraints, return neutral score
  if (!userPreferences || (!userPreferences.maxRecipeCost && !userPreferences.maxMealCost)) {
    return 50;
  }

  const maxCost = userPreferences.maxRecipeCost || userPreferences.maxMealCost || 50;
  const costPerCalorie = recipeCost / recipeCalories;

  // Score based on how much of budget is used (lower is better)
  const budgetUsage = (recipeCost / maxCost) * 100;
  
  // Inverse relationship: using less budget = higher score
  let score = 100 - (budgetUsage * 0.5);
  
  // Boost score if very cost-effective (cost per calorie is low)
  if (costPerCalorie < 0.01) {
    score += 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

