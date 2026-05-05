// backend/src/modules/cookCompleteSignals/cookCompleteSignalsController.ts
// ROADMAP 4.0 Tier J14 + J16 — combined cook-complete-signals HTTP layer.
//
// Single endpoint that returns BOTH the cook-complete celebration intensity
// (J14) and the auto-recap insight line (J16). Bundled because the cooking
// flow needs them at the same moment (post-cook) and the alternative — two
// roundtrips — adds latency to the celebration screen.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import { resolveCookCompleteIntensity } from '@/services/cookCompleteIntensityResolver';
import { computeCookRecapInsight } from '@/services/cookRecapInsightService';
import { logger } from '@/utils/logger';

export const cookCompleteSignalsController = {
  /**
   * GET /api/cook-complete-signals?cuisine=X&recipeId=Y&rating=Z
   * Returns: { intensity: 'big' | 'medium' | 'quiet', recapInsight: string | null }
   */
  async get(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const cuisine = typeof req.query.cuisine === 'string' ? req.query.cuisine : '';
      const recipeId = typeof req.query.recipeId === 'string' ? req.query.recipeId : undefined;
      const ratingRaw = typeof req.query.rating === 'string' ? Number(req.query.rating) : undefined;
      const rating = typeof ratingRaw === 'number' && Number.isFinite(ratingRaw) ? ratingRaw : undefined;
      const asOfDate = new Date();

      const [intensity, recapInsight] = await Promise.all([
        resolveCookCompleteIntensity({
          userId,
          cuisine,
          recipeId,
          rating,
          asOfDate,
        }),
        computeCookRecapInsight({
          userId,
          cuisine,
          asOfDate,
        }),
      ]);

      return res.json({ intensity, recapInsight });
    } catch (err) {
      logger.error({ err }, 'cookCompleteSignalsController.get failed');
      return res.status(500).json({ error: 'Unable to load celebration data' });
    }
  },
};
