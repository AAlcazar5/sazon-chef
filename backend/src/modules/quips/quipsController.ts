// backend/src/modules/quips/quipsController.ts
// ROADMAP 4.0 Tier J7 — Sazon daily quip HTTP layer.

import { Request, Response } from 'express';
import { pickQuipForDate } from '@/services/sazonQuipService';
import { logger } from '@/utils/logger';

export const quipsController = {
  /**
   * GET /api/quips/today
   * Returns the deterministic quip for today (UTC date-keyed).
   */
  async today(_req: Request, res: Response) {
    try {
      const quip = pickQuipForDate(new Date());
      return res.json({ quip });
    } catch (err) {
      logger.error({ err }, 'quipsController.today failed');
      return res.status(500).json({ error: 'Failed to load quip' });
    }
  },
};
