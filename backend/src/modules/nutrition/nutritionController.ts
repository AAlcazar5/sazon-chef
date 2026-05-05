// backend/src/modules/nutrition/nutritionController.ts
// ROADMAP 4.0 D14 — read endpoints for the discovery surface.
//
// GET /api/nutrition/recipe/:id   → per-serving aggregate + coverage
// GET /api/nutrition/daily?date=  → daily snapshot for the user (default today)

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';
import {
  getRecipeAggregate,
  recomputeDailySnapshot,
} from '@/services/recipeNutrientAggregationService';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const nutritionController = {
  async getRecipe(req: Request, res: Response) {
    try {
      const recipeId = req.params.id;
      if (!recipeId) return res.status(400).json({ error: 'recipeId required' });
      const aggregate = await getRecipeAggregate(recipeId);
      if (!aggregate) return res.status(404).json({ error: 'Recipe not found' });
      res.json({ aggregate });
    } catch (err) {
      logger.error({ err }, 'nutrition.getRecipe.failed');
      res.status(500).json({ error: 'Failed to load recipe nutrition' });
    }
  },

  async getDaily(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const date = (req.query.date as string | undefined) ?? todayIso();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
      }
      const snapshot = await recomputeDailySnapshot({ userId, date });
      res.json({ snapshot });
    } catch (err) {
      logger.error({ err }, 'nutrition.getDaily.failed');
      res.status(500).json({ error: 'Failed to load daily nutrition' });
    }
  },
};
