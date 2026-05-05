import { logger } from '../../utils/logger';
// Group 10R-Phase2: GET /api/user/affinity-snapshot
// Wires Prisma reads → pure affinitySnapshotService.

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import {
  computeAffinitySnapshot,
  type CookingLogForAffinity,
  type SavedRecipeForAffinity,
} from './affinitySnapshotService';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const COOKING_LOG_TAKE_CAP = 500;

export const affinityController = {
  async getSnapshot(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const cutoff = new Date(Date.now() - NINETY_DAYS_MS);

      const [logs, savedRecipes, feedback, macroGoals, physical, activeMealPlan] = await Promise.all([
        prisma.cookingLog.findMany({
          where: { userId, cookedAt: { gte: cutoff } },
          select: {
            cookedAt: true,
            recipe: {
              select: {
                id: true,
                cuisine: true,
                calories: true,
                protein: true,
                carbs: true,
                fat: true,
                fiber: true,
                ingredients: { select: { text: true } },
              },
            },
          },
          orderBy: { cookedAt: 'desc' },
          take: COOKING_LOG_TAKE_CAP,
        }),
        prisma.savedRecipe.findMany({
          where: { userId, rating: { gte: 4 } },
          select: {
            recipeId: true,
            rating: true,
            recipe: {
              select: {
                id: true,
                cuisine: true,
                calories: true,
                protein: true,
                carbs: true,
                fat: true,
                fiber: true,
                ingredients: { select: { text: true } },
              },
            },
          },
        }),
        prisma.recipeFeedback.findMany({
          where: { userId, disliked: true },
          select: { recipeId: true, liked: true, disliked: true },
        }),
        prisma.macroGoals.findUnique({ where: { userId } }),
        prisma.userPhysicalProfile.findUnique({
          where: { userId },
          select: { fitnessGoal: true },
        }),
        prisma.mealPlan.findFirst({
          where: { userId, isActive: true },
          select: { planningMode: true },
        }),
      ]);

      const cookingLogs: CookingLogForAffinity[] = logs.map((l) => ({
        cookedAt: l.cookedAt,
        recipe: {
          id: l.recipe.id,
          cuisine: l.recipe.cuisine,
          calories: l.recipe.calories,
          protein: l.recipe.protein,
          carbs: l.recipe.carbs,
          fat: l.recipe.fat,
          fiber: l.recipe.fiber,
          ingredients: l.recipe.ingredients.map((i) => i.text),
        },
      }));

      const saved: SavedRecipeForAffinity[] = savedRecipes.map((sr) => ({
        recipeId: sr.recipeId,
        rating: sr.rating,
        recipe: sr.recipe
          ? {
              id: sr.recipe.id,
              cuisine: sr.recipe.cuisine,
              calories: sr.recipe.calories,
              protein: sr.recipe.protein,
              carbs: sr.recipe.carbs,
              fat: sr.recipe.fat,
              fiber: sr.recipe.fiber,
              ingredients: sr.recipe.ingredients.map((i) => i.text),
            }
          : undefined,
      }));

      const snapshot = computeAffinitySnapshot({
        cookingLogs,
        savedRecipes: saved,
        recipeFeedback: feedback,
        macroGoals,
        fitnessGoal: physical?.fitnessGoal ?? null,
        activeMealPlanMode: activeMealPlan?.planningMode ?? null,
        now: new Date(),
      });

      return res.json(snapshot);
    } catch (error) {
      logger.error({ err: error }, 'Get affinity snapshot error:');
      return res.status(500).json({ error: 'Failed to fetch affinity snapshot' });
    }
  },
};
