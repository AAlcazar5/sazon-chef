// backend/src/modules/culturalPrimer/culturalPrimerController.ts
// ROADMAP 4.0 Tier C10 — Cultural primer HTTP layer.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import {
  getCulturalPrimer,
  isFirstCookOfCuisine,
} from '@/services/culturalPrimerService';
import { logger } from '@/utils/logger';

export const culturalPrimerController = {
  /**
   * GET /api/cultural-primer/check?cuisine=X
   * Returns whether this is the user's first cook of `cuisine` AND, if it is,
   * the primer content. Single round-trip.
   */
  async check(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const cuisine = typeof req.query.cuisine === 'string' ? req.query.cuisine : '';
      if (!cuisine) {
        return res.status(400).json({ error: 'cuisine query param required' });
      }

      const primer = getCulturalPrimer(cuisine);
      if (!primer) {
        // No primer for this cuisine in the library — never show.
        return res.json({ shouldShow: false, primer: null });
      }

      const isFirst = await isFirstCookOfCuisine({
        userId,
        cuisine,
        asOfDate: new Date(),
      });
      return res.json({ shouldShow: isFirst, primer: isFirst ? primer : null });
    } catch (err) {
      logger.error({ err }, 'culturalPrimerController.check failed');
      return res.status(500).json({ error: 'Failed to check cultural primer' });
    }
  },
};
