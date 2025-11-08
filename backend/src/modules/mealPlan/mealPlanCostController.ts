// backend/src/modules/mealPlan/mealPlanCostController.ts
// Cost optimization endpoints for meal plans

import { Request, Response } from 'express';
import { getUserId } from '../../utils/authHelper';
import { analyzeMealPlanCost, optimizeMealPlanCost, findCheaperAlternatives } from '../../utils/mealPlanCostOptimizer';

/**
 * Analyze cost of a meal plan
 * GET /api/meal-plans/:id/cost-analysis
 */
export const getMealPlanCostAnalysis = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { id } = req.params;
    const { maxDailyBudget, maxWeeklyBudget, maxMealCost } = req.query;

    const options = {
      maxDailyBudget: maxDailyBudget ? parseFloat(maxDailyBudget as string) : undefined,
      maxWeeklyBudget: maxWeeklyBudget ? parseFloat(maxWeeklyBudget as string) : undefined,
      maxMealCost: maxMealCost ? parseFloat(maxMealCost as string) : undefined,
    };

    const analysis = await analyzeMealPlanCost(id, userId, options);

    res.json(analysis);
  } catch (error: any) {
    console.error('Error analyzing meal plan cost:', error);
    res.status(500).json({ error: 'Failed to analyze meal plan cost' });
  }
};

/**
 * Optimize meal plan cost
 * POST /api/meal-plans/:id/optimize-cost
 */
export const optimizeMealPlan = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { id } = req.params;
    const { maxDailyBudget, maxWeeklyBudget, maxMealCost, prioritizeCost, allowSubstitutions } = req.body;

    const options = {
      maxDailyBudget,
      maxWeeklyBudget,
      maxMealCost,
      prioritizeCost: prioritizeCost || false,
      allowSubstitutions: allowSubstitutions !== false,
    };

    const result = await optimizeMealPlanCost(id, userId, options);

    res.json(result);
  } catch (error: any) {
    console.error('Error optimizing meal plan cost:', error);
    res.status(500).json({ error: 'Failed to optimize meal plan cost' });
  }
};

/**
 * Get cheaper alternatives for a recipe
 * GET /api/meal-plans/recipes/:recipeId/cheaper-alternatives
 */
export const getCheaperAlternatives = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { recipeId } = req.params;
    const { maxCost } = req.query;

    const alternatives = await findCheaperAlternatives(
      recipeId,
      userId,
      maxCost ? parseFloat(maxCost as string) : undefined
    );

    res.json({ alternatives });
  } catch (error: any) {
    console.error('Error finding cheaper alternatives:', error);
    res.status(500).json({ error: 'Failed to find cheaper alternatives' });
  }
};

