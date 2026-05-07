// ROADMAP 4.0 IG2.2 — "Pairs with what you have" endpoint controller.

import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { getUserId } from '../../utils/authHelper';
import { getPairs } from '../../services/ingredientCoOccurrenceService';
import { normalizeIngredientName } from '../../utils/ingredientNormalizer';

const MAX_K = 10;

/** GET /api/ingredients/pairs?with=cilantro&k=5 */
export const getIngredientPairs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const withRaw = (req.query.with ?? '') as string;
    const kRaw = (req.query.k ?? '') as string;

    if (!withRaw) {
      res.status(400).json({ error: 'with query parameter required' });
      return;
    }

    const anchor = normalizeIngredientName(withRaw);
    const parsedK = Number.parseInt(kRaw, 10);
    const k = Number.isFinite(parsedK) && parsedK > 0
      ? Math.min(parsedK, MAX_K)
      : 5;

    const pairs = await getPairs({
      userId,
      withIngredient: anchor,
      k,
    });

    res.json({ pairs });
  } catch (err) {
    logger.error({ err }, 'IG2.2 getIngredientPairs failed');
    res.status(500).json({ error: 'Failed to load ingredient pairs' });
  }
};
