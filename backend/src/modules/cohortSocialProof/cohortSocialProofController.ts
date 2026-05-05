// backend/src/modules/cohortSocialProof/cohortSocialProofController.ts
// ROADMAP 4.0 F9 — Cohort social proof HTTP layer.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import { computeCohortSocialProof } from '@/services/cohortSocialProofService';
import { logger } from '@/utils/logger';

export const cohortSocialProofController = {
  /**
   * GET /api/cohort-social-proof
   * Returns the top trending cuisine in the user's cohort, or null when
   * there isn't enough signal. Hides silently on the client when null.
   */
  async get(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const result = await computeCohortSocialProof({ userId });
      return res.json({ proof: result });
    } catch (err) {
      logger.error({ err }, 'cohortSocialProofController.get failed');
      return res.status(500).json({ error: 'Failed to compute cohort social proof' });
    }
  },
};
