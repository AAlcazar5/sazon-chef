// backend/src/modules/costTracking/costTrackingController.ts
// Cost tracking and budget management

import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';
import { calculateRecipeCost, isWithinBudget, calculateCostScore } from '../../utils/costCalculator';

export const costTrackingController = {
  /**
   * Get recipe cost
   * GET /api/cost-tracking/recipes/:id/cost
   */
  async getRecipeCost(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const result = await calculateRecipeCost(id, userId);

      res.json(result);
    } catch (error: any) {
      console.error('Error getting recipe cost:', error);
      res.status(500).json({ error: 'Failed to get recipe cost' });
    }
  },

  /**
   * Update recipe cost (user-provided)
   * PUT /api/cost-tracking/recipes/:id/cost
   */
  async updateRecipeCost(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { estimatedCost, estimatedCostPerServing } = req.body;

      if (!estimatedCost && !estimatedCostPerServing) {
        return res.status(400).json({ error: 'Cost is required' });
      }

      const recipe = await prisma.recipe.findUnique({
        where: { id },
        select: { servings: true },
      });

      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      const cost = estimatedCost || (estimatedCostPerServing * recipe.servings);
      const costPerServing = estimatedCostPerServing || (estimatedCost / recipe.servings);

      const updated = await prisma.recipe.update({
        where: { id },
        data: {
          estimatedCost: cost,
          estimatedCostPerServing: costPerServing,
          costSource: 'user',
        },
      });

      res.json({
        estimatedCost: updated.estimatedCost,
        estimatedCostPerServing: updated.estimatedCostPerServing,
        costSource: updated.costSource,
      });
    } catch (error: any) {
      console.error('Error updating recipe cost:', error);
      res.status(500).json({ error: 'Failed to update recipe cost' });
    }
  },

  /**
   * Get user's ingredient costs
   * GET /api/cost-tracking/ingredients
   */
  async getIngredientCosts(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const costs = await prisma.ingredientCost.findMany({
        where: { userId },
        orderBy: { lastUpdated: 'desc' },
      });

      res.json(costs);
    } catch (error: any) {
      console.error('Error getting ingredient costs:', error);
      res.status(500).json({ error: 'Failed to get ingredient costs' });
    }
  },

  /**
   * Add or update ingredient cost
   * POST /api/cost-tracking/ingredients
   */
  async upsertIngredientCost(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { ingredientName, unitCost, unit, store, location } = req.body;

      if (!ingredientName || unitCost === undefined) {
        return res.status(400).json({ error: 'Ingredient name and unit cost are required' });
      }

      // Find existing cost for this ingredient
      const existing = await prisma.ingredientCost.findFirst({
        where: {
          userId,
          ingredientName: ingredientName.toLowerCase().trim(),
        },
      });

      const costData = {
        ingredientName: ingredientName.toLowerCase().trim(),
        unitCost: parseFloat(unitCost),
        unit: unit || 'lb',
        store: store || null,
        location: location || null,
        lastUpdated: new Date(),
      };

      let cost;
      if (existing) {
        cost = await prisma.ingredientCost.update({
          where: { id: existing.id },
          data: costData,
        });
      } else {
        cost = await prisma.ingredientCost.create({
          data: {
            ...costData,
            userId,
          },
        });
      }

      res.json(cost);
    } catch (error: any) {
      console.error('Error upserting ingredient cost:', error);
      res.status(500).json({ error: 'Failed to save ingredient cost' });
    }
  },

  /**
   * Delete ingredient cost
   * DELETE /api/cost-tracking/ingredients/:id
   */
  async deleteIngredientCost(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const cost = await prisma.ingredientCost.findFirst({
        where: { id, userId },
      });

      if (!cost) {
        return res.status(404).json({ error: 'Ingredient cost not found' });
      }

      await prisma.ingredientCost.delete({
        where: { id },
      });

      res.json({ message: 'Ingredient cost deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting ingredient cost:', error);
      res.status(500).json({ error: 'Failed to delete ingredient cost' });
    }
  },

  /**
   * Get user budget settings
   * GET /api/cost-tracking/budget
   */
  async getBudget(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
        select: {
          maxRecipeCost: true,
          maxMealCost: true,
          maxDailyFoodBudget: true,
          currency: true,
        },
      });

      res.json({
        maxRecipeCost: preferences?.maxRecipeCost || null,
        maxMealCost: preferences?.maxMealCost || null,
        maxDailyFoodBudget: preferences?.maxDailyFoodBudget || null,
        currency: preferences?.currency || 'USD',
      });
    } catch (error: any) {
      console.error('Error getting budget:', error);
      res.status(500).json({ error: 'Failed to get budget settings' });
    }
  },

  /**
   * Update user budget settings
   * PUT /api/cost-tracking/budget
   */
  async updateBudget(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { maxRecipeCost, maxMealCost, maxDailyFoodBudget, currency } = req.body;

      // Get or create preferences
      let preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        preferences = await prisma.userPreferences.create({
          data: {
            userId,
            cookTimePreference: 30,
            maxRecipeCost: maxRecipeCost || null,
            maxMealCost: maxMealCost || null,
            maxDailyFoodBudget: maxDailyFoodBudget || null,
            currency: currency || 'USD',
          },
        });
      } else {
        preferences = await prisma.userPreferences.update({
          where: { userId },
          data: {
            ...(maxRecipeCost !== undefined && { maxRecipeCost }),
            ...(maxMealCost !== undefined && { maxMealCost }),
            ...(maxDailyFoodBudget !== undefined && { maxDailyFoodBudget }),
            ...(currency && { currency }),
          },
        });
      }

      res.json({
        maxRecipeCost: preferences.maxRecipeCost,
        maxMealCost: preferences.maxMealCost,
        maxDailyFoodBudget: preferences.maxDailyFoodBudget,
        currency: preferences.currency || 'USD',
      });
    } catch (error: any) {
      console.error('Error updating budget:', error);
      res.status(500).json({ error: 'Failed to update budget settings' });
    }
  },
};

