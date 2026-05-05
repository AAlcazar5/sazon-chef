// backend/src/modules/cookingHistoryStats/cookingHistoryStatsController.ts
// ROADMAP 4.0 Tier J11 — Most-recent-cook lookup for the first-of-day greeting.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

export const cookingHistoryStatsController = {
  /**
   * GET /api/cooking-logs/most-recent
   * Returns the user's most recent cooking log + the recipe's cuisine. Drives
   * the J11 first-of-day personalized greeting on Today.
   */
  async mostRecent(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const log = await (prisma as any).cookingLog.findFirst({
        where: { userId },
        orderBy: { cookedAt: 'desc' },
        select: {
          cookedAt: true,
          recipe: { select: { id: true, title: true, cuisine: true } },
        },
      });
      if (!log) {
        return res.json({ mostRecent: null });
      }
      return res.json({
        mostRecent: {
          cookedAt: log.cookedAt,
          recipe: log.recipe,
        },
      });
    } catch (err) {
      logger.error({ err }, 'cookingHistoryStatsController.mostRecent failed');
      return res.status(500).json({ error: 'Failed to load most-recent cook' });
    }
  },
};
