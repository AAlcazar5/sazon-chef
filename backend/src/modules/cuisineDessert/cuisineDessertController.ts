// backend/src/modules/cuisineDessert/cuisineDessertController.ts
// ROADMAP 4.0 F2 — cuisine dessert breakdowns + no-results telemetry.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';
import {
  getCategoriesForCuisine,
  getNoResultsRates,
  logCuisineSearchNoResults,
} from '@/services/cuisineDessertService';

export const cuisineDessertController = {
  async getForCuisine(req: Request, res: Response) {
    try {
      const cuisine = req.params.cuisine ?? '';
      if (!cuisine.trim()) return res.status(400).json({ error: 'cuisine required' });
      const result = getCategoriesForCuisine(cuisine);
      res.json(result);
    } catch (err) {
      logger.error({ err }, 'cuisineDessert.getForCuisine.failed');
      res.status(500).json({ error: 'Failed to load cuisine desserts' });
    }
  },

  async logNoResults(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { cuisine } = req.body as { cuisine?: string };
      if (!cuisine || !cuisine.trim()) {
        return res.status(400).json({ error: 'cuisine required' });
      }
      await logCuisineSearchNoResults(userId, cuisine);
      res.status(201).json({ success: true });
    } catch (err) {
      logger.error({ err }, 'cuisineDessert.logNoResults.failed');
      res.status(500).json({ error: 'Failed to log no-results event' });
    }
  },

  async getRates(_req: Request, res: Response) {
    try {
      const rows = await getNoResultsRates();
      res.json({ rates: rows });
    } catch (err) {
      logger.error({ err }, 'cuisineDessert.getRates.failed');
      res.status(500).json({ error: 'Failed to load no-results rates' });
    }
  },
};
