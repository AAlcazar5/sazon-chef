// backend/src/modules/discoveryMilestones/discoveryMilestonesController.ts
// ROADMAP 4.0 Tier J5 — Discovery milestones HTTP layer.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import {
  markMilestone,
  getMilestonesAchieved,
  isKnownMilestoneKey,
} from '@/services/discoveryMilestoneService';
import { logger } from '@/utils/logger';

export const discoveryMilestonesController = {
  /**
   * POST /api/discovery-milestones { key }
   * Idempotently marks the milestone for the authenticated user. Returns
   * { newlyAchieved, alreadyAchieved } so the caller can render the inline
   * celebration only on the newly-achieved transition.
   */
  async mark(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const key = typeof req.body?.key === 'string' ? req.body.key : '';
      if (!isKnownMilestoneKey(key)) {
        return res.status(400).json({ error: 'Unknown milestone key' });
      }
      const result = await markMilestone(userId, key);
      return res.json(result);
    } catch (err) {
      logger.error({ err }, 'discoveryMilestonesController.mark failed');
      return res.status(500).json({ error: 'Failed to mark milestone' });
    }
  },

  /**
   * GET /api/discovery-milestones
   * Returns the set of milestone keys the user has achieved.
   */
  async list(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const achieved = await getMilestonesAchieved(userId);
      return res.json({ achieved });
    } catch (err) {
      logger.error({ err }, 'discoveryMilestonesController.list failed');
      return res.status(500).json({ error: 'Failed to load milestones' });
    }
  },
};
