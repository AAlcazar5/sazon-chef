// ROADMAP 4.0 IG10.1 — Pantry IQ controller.

import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { getUserId } from '../../utils/authHelper';
import { computePantryIQ } from '../../services/pantryIQService';

/** GET /api/pantry-iq */
export const getPantryIQ = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const iq = await computePantryIQ({ userId });
    if (iq == null) {
      // Cold-start — frontend hides the card via N2.1 anyway.
      res.json({ iq: null });
      return;
    }
    res.json({ iq });
  } catch (err) {
    logger.error({ err }, 'IG10.1 getPantryIQ failed');
    res.status(500).json({ error: 'Failed to compute Pantry IQ' });
  }
};
