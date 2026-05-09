import { logger } from '../utils/logger';
// backend/src/middleware/requirePremium.ts
// Middleware that gates a route to premium (active or trialing) subscribers only.
// Returns 402 with PREMIUM_REQUIRED error code for easy frontend detection.

import { Request, Response, NextFunction } from 'express';
import { fetchUserSubscription } from './fetchUserSubscription';

export const requirePremium = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await fetchUserSubscription(userId);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isPremium =
      user.subscriptionTier === 'premium' &&
      (user.subscriptionStatus === 'active' ||
        user.subscriptionStatus === 'trialing');

    if (!isPremium) {
      return res.status(402).json({
        error: 'PREMIUM_REQUIRED',
        message: 'This feature requires a Sazon Premium subscription.',
      });
    }

    next();
  } catch (err) {
    logger.error({ err: err }, 'requirePremium error:');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
