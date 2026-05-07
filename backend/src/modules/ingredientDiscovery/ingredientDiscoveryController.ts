// ROADMAP 4.0 IG8.2 — "Try this ingredient" controller.

import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { getUserId } from '../../utils/authHelper';
import { pickWeeklyDiscovery } from '../../services/ingredientDiscoveryService';
import { logIngredientEvent } from '../../services/recommender/ingredientRecommenderLog';

/** GET /api/ingredient-discovery/weekly */
export const getWeeklyDiscovery = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const suggestion = await pickWeeklyDiscovery({ userId });
    if (!suggestion) {
      res.json({ suggestion: null });
      return;
    }
    // IG9.1 — log the impression so the 60-day cooldown applies.
    await logIngredientEvent({
      userId,
      surface: 'pantry_iq',
      eventType: 'impression',
      suggestedItem: suggestion.ingredient,
      source: 'cultural',
      metadata: { kind: 'cultural-discovery', cuisine: suggestion.cuisine },
    });
    res.json({ suggestion });
  } catch (err) {
    logger.error({ err }, 'IG8.2 getWeeklyDiscovery failed');
    res.status(500).json({ error: 'Failed to load weekly discovery' });
  }
};
