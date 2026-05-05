// backend/src/modules/drinkPairing/drinkPairingController.ts
// ROADMAP 4.0 F8 — Drink pairing HTTP layer.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import { buildPairingPayload } from '@/services/drinkPairingService';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

export const drinkPairingController = {
  /**
   * GET /api/drink-pairing?cuisine=X
   *
   * Returns a 2- or 3-line pairing payload for the cuisine. Honors the
   * caller's `excludeAlcoholic` UserPreferences flag (set during
   * onboarding A5-a "specific health goals" or via Sazon if asked).
   */
  async get(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const cuisine = typeof req.query.cuisine === 'string' ? req.query.cuisine : '';
      if (!cuisine) {
        return res.status(400).json({ error: 'cuisine query param required' });
      }

      // Look up the user's "exclude alcohol" preference. dietaryRestrictions
      // on UserPreferences is a relation of {name, severity} rows; the
      // "alcohol-free" / "no-alcohol" rows mean we drop the alcoholic line.
      let excludeAlcoholic = false;
      try {
        const prefs = await prisma.userPreferences.findUnique({
          where: { userId },
          select: { dietaryRestrictions: true },
        });
        const rows = (prefs?.dietaryRestrictions ?? []) as Array<{ name?: string }>;
        excludeAlcoholic = rows.some(
          (r) => typeof r?.name === 'string' && r.name.toLowerCase().includes('alcohol'),
        );
      } catch {
        // Best-effort — if the lookup fails, return all 3 suggestions.
      }

      const payload = buildPairingPayload({ cuisine, excludeAlcoholic });
      return res.json(payload);
    } catch (err) {
      logger.error({ err }, 'drinkPairingController.get failed');
      return res.status(500).json({ error: 'Failed to fetch drink pairing' });
    }
  },
};
