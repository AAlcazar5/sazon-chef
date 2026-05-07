// ROADMAP 4.0 N12 — activation surface controller.

import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { getUserId } from '../../utils/authHelper';
import { pickActivationSurface } from '../../services/activationSurfacePlanner';

/** GET /api/today/activation */
export const getActivationSurface = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const surface = await pickActivationSurface({ userId });
    res.json({ surface });
  } catch (err) {
    logger.error({ err }, 'N12 getActivationSurface failed');
    res.status(500).json({ error: 'Failed to load activation surface' });
  }
};
