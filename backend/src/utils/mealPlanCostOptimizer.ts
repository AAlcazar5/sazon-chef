// backend/src/utils/mealPlanCostOptimizer.ts
// Optimize meal plans based on cost and budget constraints

import { prisma } from '../lib/prisma';
import { calculateRecipeCost } from './costCalculator';

export interface MealPlanCostAnalysis {
  totalCost: number;
  costPerDay: number;
  costPerMeal: number;
  mealsCount: number;
  daysCount: number;
  isWithinBudget: boolean;
  budgetRemaining?: number;
  budgetExceeded?: number;
  costBreakdown: {
    mealId: string;
    recipeId?: string;
    mealType: string;
    date: Date;
    cost: number;
    recipeName?: string;
  }[];
  recommendations?: string[];
}

export interface MealPlanOptimizationOptions {
  maxDailyBudget?: number;
  maxWeeklyBudget?: number;
  maxMealCost?: number;
  prioritizeCost?: boolean; // If true, prioritize cheaper recipes
  allowSubstitutions?: boolean; // If true, suggest cheaper alternatives
}

/**
 * Analyze the cost of a meal plan
 */
export async function analyzeMealPlanCost(
  mealPlanId: string,
  userId: string,
  options: MealPlanOptimizationOptions = {}
): Promise<MealPlanCostAnalysis> {
  const mealPlan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, userId },
    include: {
      meals: {
        include: {
          recipe: true,
        },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!mealPlan) {
    throw new Error('Meal plan not found');
  }

  const costBreakdown: MealPlanCostAnalysis['costBreakdown'] = [];
  let totalCost = 0;

  // Calculate cost for each meal
  for (const meal of mealPlan.meals) {
    let mealCost = 0;

    if (meal.recipe) {
      try {
        const costResult = await calculateRecipeCost(meal.recipe.id, userId);
        mealCost = costResult.estimatedCost || 0;
      } catch (error) {
        // If cost calculation fails, estimate as 0
        console.warn(`Failed to calculate cost for recipe ${meal.recipe.id}:`, error);
      }
    } else if (meal.customCalories) {
      // Estimate cost for custom meals (rough estimate: $0.10 per 100 calories)
      mealCost = (meal.customCalories / 100) * 0.10;
    }

    costBreakdown.push({
      mealId: meal.id,
      recipeId: meal.recipeId || undefined,
      mealType: meal.mealType,
      date: meal.date,
      cost: mealCost,
      recipeName: meal.recipe?.title || meal.customName || undefined,
    });

    totalCost += mealCost;
  }

  // Calculate date range
  const dates = mealPlan.meals.map(m => m.date);
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const daysCount = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const mealsCount = mealPlan.meals.length;
  const costPerDay = daysCount > 0 ? totalCost / daysCount : 0;
  const costPerMeal = mealsCount > 0 ? totalCost / mealsCount : 0;

  // Check budget constraints
  const maxDailyBudget = options.maxDailyBudget;
  const maxWeeklyBudget = options.maxWeeklyBudget;
  const maxMealCost = options.maxMealCost;

  let isWithinBudget = true;
  let budgetRemaining: number | undefined;
  let budgetExceeded: number | undefined;
  const recommendations: string[] = [];

  if (maxWeeklyBudget) {
    if (totalCost > maxWeeklyBudget) {
      isWithinBudget = false;
      budgetExceeded = totalCost - maxWeeklyBudget;
      recommendations.push(
        `Meal plan exceeds weekly budget by $${budgetExceeded.toFixed(2)}. Consider cheaper recipe alternatives.`
      );
    } else {
      budgetRemaining = maxWeeklyBudget - totalCost;
      recommendations.push(
        `You have $${budgetRemaining.toFixed(2)} remaining in your weekly budget.`
      );
    }
  }

  if (maxDailyBudget) {
    const dailyCost = costPerDay;
    if (dailyCost > maxDailyBudget) {
      isWithinBudget = false;
      const exceeded = dailyCost - maxDailyBudget;
      recommendations.push(
        `Daily average cost ($${dailyCost.toFixed(2)}) exceeds daily budget ($${maxDailyBudget.toFixed(2)}) by $${exceeded.toFixed(2)}.`
      );
    }
  }

  if (maxMealCost) {
    const expensiveMeals = costBreakdown.filter(m => m.cost > maxMealCost);
    if (expensiveMeals.length > 0) {
      isWithinBudget = false;
      recommendations.push(
        `${expensiveMeals.length} meal(s) exceed the maximum meal cost of $${maxMealCost.toFixed(2)}.`
      );
    }
  }

  return {
    totalCost,
    costPerDay,
    costPerMeal,
    mealsCount,
    daysCount,
    isWithinBudget,
    budgetRemaining,
    budgetExceeded,
    costBreakdown,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
}

/**
 * Find cheaper recipe alternatives for expensive meals
 */
export async function findCheaperAlternatives(
  recipeId: string,
  userId: string,
  maxCost?: number
): Promise<Array<{ recipe: any; cost: number; savings: number }>> {
  const originalRecipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
  });

  if (!originalRecipe) {
    return [];
  }

  // Get original cost
  const originalCostResult = await calculateRecipeCost(recipeId, userId);
  const originalCost = originalCostResult.estimatedCost || 0;

  // Find similar recipes (same cuisine, similar macros) that are cheaper
  const alternatives = await prisma.recipe.findMany({
    where: {
      id: { not: recipeId },
      cuisine: originalRecipe.cuisine || undefined,
      // Similar calorie range (±20%)
      calories: {
        gte: originalRecipe.calories * 0.8,
        lte: originalRecipe.calories * 1.2,
      },
    },
    take: 10,
  });

  // Calculate costs and filter
  const alternativesWithCost = await Promise.all(
    alternatives.map(async (recipe) => {
      try {
        const costResult = await calculateRecipeCost(recipe.id, userId);
        const cost = costResult.estimatedCost || 0;
        const savings = originalCost - cost;

        return {
          recipe,
          cost,
          savings,
        };
      } catch (error) {
        return null;
      }
    })
  );

  // Filter and sort
  const validAlternatives = alternativesWithCost
    .filter((alt): alt is NonNullable<typeof alt> => 
      alt !== null && 
      alt.cost < originalCost && 
      (maxCost === undefined || alt.cost <= maxCost)
    )
    .sort((a, b) => a.cost - b.cost) // Sort by cost (cheapest first)
    .slice(0, 5); // Top 5 cheapest alternatives

  return validAlternatives;
}

/**
 * Optimize a meal plan to fit within budget
 */
export async function optimizeMealPlanCost(
  mealPlanId: string,
  userId: string,
  options: MealPlanOptimizationOptions
): Promise<{
  analysis: MealPlanCostAnalysis;
  suggestedChanges: Array<{
    mealId: string;
    currentRecipeId?: string;
    currentCost: number;
    suggestedRecipeId?: string;
    suggestedCost: number;
    savings: number;
    reason: string;
  }>;
}> {
  const analysis = await analyzeMealPlanCost(mealPlanId, userId, options);

  const suggestedChanges: Array<{
    mealId: string;
    currentRecipeId?: string;
    currentCost: number;
    suggestedRecipeId?: string;
    suggestedCost: number;
    savings: number;
    reason: string;
  }> = [];

  // If within budget and not prioritizing cost, return as-is
  if (analysis.isWithinBudget && !options.prioritizeCost) {
    return { analysis, suggestedChanges };
  }

  // Find expensive meals and suggest cheaper alternatives
  for (const meal of analysis.costBreakdown) {
    if (!meal.recipeId) continue;

    const maxCost = options.maxMealCost || (options.maxDailyBudget ? options.maxDailyBudget / 3 : undefined);

    // If meal exceeds max cost, find alternatives
    if (maxCost && meal.cost > maxCost) {
      const alternatives = await findCheaperAlternatives(meal.recipeId, userId, maxCost);

      if (alternatives.length > 0) {
        const bestAlternative = alternatives[0];
        suggestedChanges.push({
          mealId: meal.mealId,
          currentRecipeId: meal.recipeId,
          currentCost: meal.cost,
          suggestedRecipeId: bestAlternative.recipe.id,
          suggestedCost: bestAlternative.cost,
          savings: bestAlternative.savings,
          reason: `Exceeds max meal cost of $${maxCost.toFixed(2)}`,
        });
      }
    } else if (options.prioritizeCost && meal.cost > analysis.costPerMeal * 1.5) {
      // If prioritizing cost and meal is significantly above average, suggest alternatives
      const alternatives = await findCheaperAlternatives(meal.recipeId, userId);

      if (alternatives.length > 0 && alternatives[0].savings > 2) {
        // Only suggest if savings is significant (>$2)
        const bestAlternative = alternatives[0];
        suggestedChanges.push({
          mealId: meal.mealId,
          currentRecipeId: meal.recipeId,
          currentCost: meal.cost,
          suggestedRecipeId: bestAlternative.recipe.id,
          suggestedCost: bestAlternative.cost,
          savings: bestAlternative.savings,
          reason: 'Could save money with a cheaper alternative',
        });
      }
    }
  }

  return { analysis, suggestedChanges };
}

