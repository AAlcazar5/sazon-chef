// backend/src/modules/ingredientAvailability/ingredientAvailabilityController.ts
// Ingredient availability endpoints

import { Request, Response } from 'express';
import {
  checkIngredientAvailability,
  analyzeRecipeAvailability,
  filterRecipesByAvailability,
} from '../../utils/ingredientAvailability';

/**
 * Check availability for a specific ingredient
 * GET /api/ingredient-availability/:ingredientName
 */
export const checkIngredient = async (req: Request, res: Response) => {
  try {
    const userId = 'temp-user-id'; // TODO: Replace with actual auth
    const { ingredientName } = req.params;
    const { location } = req.query;

    const availability = await checkIngredientAvailability(
      ingredientName,
      userId,
      location as string | undefined
    );

    res.json(availability);
  } catch (error: any) {
    console.error('Error checking ingredient availability:', error);
    res.status(500).json({ error: 'Failed to check ingredient availability' });
  }
};

/**
 * Analyze recipe ingredient availability
 * GET /api/ingredient-availability/recipes/:recipeId
 */
export const analyzeRecipe = async (req: Request, res: Response) => {
  try {
    const userId = 'temp-user-id'; // TODO: Replace with actual auth
    const { recipeId } = req.params;
    const { location } = req.query;

    const analysis = await analyzeRecipeAvailability(
      recipeId,
      userId,
      location as string | undefined
    );

    if (!analysis) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json(analysis);
  } catch (error: any) {
    console.error('Error analyzing recipe availability:', error);
    res.status(500).json({ error: 'Failed to analyze recipe availability' });
  }
};

/**
 * Filter recipes by availability
 * POST /api/ingredient-availability/filter-recipes
 */
export const filterRecipes = async (req: Request, res: Response) => {
  try {
    const userId = 'temp-user-id'; // TODO: Replace with actual auth
    const { recipeIds, minAvailabilityScore } = req.body;

    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ error: 'recipeIds array is required' });
    }

    const filteredIds = await filterRecipesByAvailability(
      recipeIds,
      userId,
      minAvailabilityScore || 70
    );

    res.json({ recipeIds: filteredIds });
  } catch (error: any) {
    console.error('Error filtering recipes by availability:', error);
    res.status(500).json({ error: 'Failed to filter recipes by availability' });
  }
};

