import { logger } from '../../utils/logger';
// backend/src/modules/recipe/recipeCookbookController.ts
//
// R1-2 split (round 2, 2026-05-04) — extracted cookbook-meta + cooking-log
// handlers from the recipeController.ts. Owns the per-recipe metadata
// surface (notes, rating) plus the view/cook tracking that feeds the
// behavioral data + affinity events.
//
// recipeController re-exports each handler so existing callers and tests
// don't have to change import paths.

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { recommendationCache } from '@/utils/recommendationCache';
import { recordAffinityEvent } from '@/services/slotAffinityService';

export const recipeCookbookController = {
  async getSavedMeta(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      const savedRecipe = await prisma.savedRecipe.findFirst({
        where: { userId, recipeId: id },
        select: { notes: true, rating: true },
      });

      if (!savedRecipe) {
        return res.json({ notes: null, rating: null });
      }

      res.json({ notes: savedRecipe.notes ?? null, rating: savedRecipe.rating ?? null });
    } catch (error: any) {
      logger.error({ data: error }, '❌ Get saved meta error:');
      res.status(500).json({ error: 'Failed to get saved recipe metadata' });
    }
  },

  // Update saved recipe notes/rating
  async updateSavedMeta(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const { notes, rating } = req.body as { notes?: string | null; rating?: number | null };

      if (rating !== undefined && rating !== null) {
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
        }
      }

      const savedRecipe = await prisma.savedRecipe.findFirst({
        where: { userId, recipeId: id }
      });

      if (!savedRecipe) {
        return res.status(404).json({ error: 'Saved recipe not found' });
      }

      const updated = await prisma.savedRecipe.update({
        where: { id: savedRecipe.id },
        data: {
          ...(notes !== undefined ? { notes } : {}),
          ...(rating !== undefined ? { rating } : {}),
        }
      });

      // Phase 4: fire affinity event for user-composed recipe ratings
      if (rating !== undefined && rating !== null && (rating >= 4 || rating <= 2)) {
        const recipe = await prisma.recipe.findUnique({
          where: { id },
          select: { source: true },
        });
        if (recipe?.source === 'user-composed') {
          const plate = await prisma.composedPlate.findFirst({
            where: { recipeId: id, userId },
            select: { componentIds: true },
          });
          if (plate) {
            try {
              const entries: Array<{ componentId: string }> = JSON.parse(plate.componentIds);
              const componentIds = entries.map((e) => e.componentId);
              const stars = rating as 1 | 2 | 3 | 4 | 5;
              recordAffinityEvent({ type: 'plate_rated', userId, componentIds, stars }).catch(
                (err) => logger.warn({ data: err }, '[affinity] plate_rated event failed (non-fatal):')
              );
            } catch {
              // malformed componentIds JSON — skip silently
            }
          }
        }
      }

      logger.info({ recipeId: id, notes: !!updated.notes, rating: updated.rating }, '✅ Saved recipe meta updated:');
      res.json({ message: 'Updated successfully', notes: updated.notes, rating: updated.rating });
    } catch (error: any) {
      logger.error({ data: error }, '❌ Update saved meta error:');
      res.status(500).json({ error: 'Failed to update saved recipe metadata' });
    }
  },

  // Record recipe view
  async recordView(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      await (prisma as any).recipeView.upsert({
        where: { recipeId_userId: { recipeId: id, userId } },
        create: { recipeId: id, userId, viewedAt: new Date() },
        update: { viewedAt: new Date() },
      });

      logger.info({ data: id }, '👁️ Recipe view recorded:');
      res.json({ message: 'View recorded' });
    } catch (error: any) {
      logger.error({ data: error }, '❌ Record view error:');
      res.status(500).json({ error: 'Failed to record view' });
    }
  },

  // Get recently viewed recipes
  async getRecentlyViewed(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 50);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const views = await (prisma as any).recipeView.findMany({
        where: {
          userId,
          viewedAt: { gte: cutoffDate },
        },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } },
            }
          }
        },
        orderBy: { viewedAt: 'desc' },
        take: limit,
      });

      const recipes = views.map((v: any) => ({
        ...v.recipe,
        viewedAt: v.viewedAt.toISOString(),
      }));

      logger.info(`👁️ Found ${recipes.length} recently viewed recipes`);
      res.json(recipes);
    } catch (error: any) {
      logger.error({ data: error }, '❌ Get recently viewed error:');
      res.status(500).json({ error: 'Failed to get recently viewed recipes' });
    }
  },

  // Record cooking session
  async recordCook(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const { notes } = req.body as { notes?: string };

      await (prisma as any).cookingLog.create({
        data: { recipeId: id, userId, notes: notes || null },
      });

      // Invalidate behavioral cache so consumed recipe data is refreshed
      recommendationCache.invalidateUserCache(userId);

      // Phase 4: fire affinity event for user-composed recipes
      const recipe = await prisma.recipe.findUnique({
        where: { id },
        select: { source: true },
      });
      if (recipe?.source === 'user-composed') {
        const plate = await prisma.composedPlate.findFirst({
          where: { recipeId: id, userId },
          select: { componentIds: true },
        });
        if (plate) {
          try {
            const entries: Array<{ componentId: string }> = JSON.parse(plate.componentIds);
            const componentIds = entries.map((e) => e.componentId);
            recordAffinityEvent({ type: 'plate_cooked', userId, componentIds }).catch(
              (err) => logger.warn({ data: err }, '[affinity] plate_cooked event failed (non-fatal):')
            );
          } catch {
            // malformed componentIds JSON — skip silently
          }
        }
      }

      res.json({ message: 'Cook recorded' });
    } catch (error: any) {
      logger.error({ data: error }, '❌ Record cook error:');
      res.status(500).json({ error: 'Failed to record cook' });
    }
  },

  // Get cooking history for a recipe
  async getCookingHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      const logs = await (prisma as any).cookingLog.findMany({
        where: { recipeId: id, userId },
        orderBy: { cookedAt: 'desc' },
      });

      res.json({
        recipeId: id,
        cookCount: logs.length,
        lastCooked: logs.length > 0 ? logs[0].cookedAt.toISOString() : null,
        history: logs.map((l: any) => ({
          id: l.id,
          cookedAt: l.cookedAt.toISOString(),
          notes: l.notes,
        })),
      });
    } catch (error: any) {
      logger.error({ data: error }, '❌ Get cooking history error:');
      res.status(500).json({ error: 'Failed to get cooking history' });
    }
  },
};
