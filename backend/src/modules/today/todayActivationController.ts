// ROADMAP 4.0 N12 — activation surface controller.
// ROADMAP 4.0 N2.2 — Today coverage tier endpoint (first-7-days plan).

import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { getUserId } from '../../utils/authHelper';
import { pickActivationSurface } from '../../services/activationSurfacePlanner';
import { buildPersonalizationContext } from '../../services/personalizationContext';

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

/**
 * GET /api/today/coverage — N2.2 first-7-days surface coordination.
 * Returns the user's signal-coverage tier (cold/mid/high) so the frontend
 * `useSurfaceVisibility` hook can decide which Today surfaces to render.
 * Replaces the previous "all surfaces always render and individually hide"
 * pattern with a single source of truth.
 */
export const getCoverageTier = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const ctx = await buildPersonalizationContext({ userId });
    res.json({
      tier: ctx.signalCoverage,
      recentCookCount: ctx.recentCookCount,
      lifetimeCookCount: ctx.lifetimeCookCount,
      daysSinceSignup: ctx.daysSinceSignup,
    });
  } catch (err) {
    logger.error({ err }, 'N2.2 getCoverageTier failed');
    res.status(500).json({ error: 'Failed to load coverage tier' });
  }
};
