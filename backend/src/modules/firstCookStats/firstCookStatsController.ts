// backend/src/modules/firstCookStats/firstCookStatsController.ts
// ROADMAP 4.0 Tier J2 — First-cook stats HTTP layer.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import { computeFirstCookStats } from '@/services/firstCookStatsService';
import { logger } from '@/utils/logger';

export const firstCookStatsController = {
  /**
   * GET /api/first-cook-stats?cuisine=X
   * Returns whether this is the user's first cook of `cuisine` and how many
   * distinct cuisines they have cooked total. Drives the J2 passport-stamp
   * celebration on the cooking-complete screen.
   */
  async get(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const cuisine = typeof req.query.cuisine === 'string' ? req.query.cuisine : '';
      const stats = await computeFirstCookStats({
        userId,
        cuisine,
        asOfDate: new Date(),
      });
      return res.json(stats);
    } catch (err) {
      logger.error({ err }, 'firstCookStatsController.get failed');
      return res.status(500).json({ error: 'Failed to compute first-cook stats' });
    }
  },
};
