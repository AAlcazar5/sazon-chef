// ROADMAP 4.0 A7.4 — Welcome-back peak controller.

import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { getUserId } from '../../utils/authHelper';
import { pickWelcomeBackPeak } from '../../services/welcomeBackService';

/** GET /api/auth/welcome-back */
export const getWelcomeBack = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const peak = await pickWelcomeBackPeak({ userId });
    res.json({ peak });
  } catch (err) {
    logger.error({ err }, 'A7.4 getWelcomeBack failed');
    res.status(500).json({ error: 'Failed to load welcome-back peak' });
  }
};
