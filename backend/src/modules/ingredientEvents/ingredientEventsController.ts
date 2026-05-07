// ROADMAP 4.0 IG6.1 — Ingredient events controller (swap-tap logger).
//
// Frontend posts a swap-tap event; backend writes BOTH a `swappedOut`
// (originalName → swapTargetName) AND a `swappedIn` (swapTargetName →
// originalName) row in one transactional batch. This double-write lets
// downstream readers query from either side without inferring partners.

import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { getUserId } from '../../utils/authHelper';
import { recordMany } from '../../services/ingredientEventService';

export interface SwapTapInput {
  /** Original recipe ingredient the user is replacing. */
  originalName: string;
  /** Substitute ingredient the user picked. */
  swapTargetName: string;
  /** Optional recipe id for traceability. */
  recipeId?: string;
}

const NAME_MAX = 80;

function isValidName(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0 && s.length <= NAME_MAX;
}

/**
 * POST /api/ingredient-events/swap
 * Body: { originalName, swapTargetName, recipeId? }
 */
export const recordSwapTap = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const body = (req.body ?? {}) as Partial<SwapTapInput>;

    if (!isValidName(body.originalName) || !isValidName(body.swapTargetName)) {
      res.status(400).json({ error: 'originalName and swapTargetName required' });
      return;
    }
    if (
      body.recipeId !== undefined &&
      (typeof body.recipeId !== 'string' || body.recipeId.length > 64)
    ) {
      res.status(400).json({ error: 'recipeId must be a short string' });
      return;
    }
    if (
      body.originalName.trim().toLowerCase() ===
      body.swapTargetName.trim().toLowerCase()
    ) {
      res.status(400).json({ error: 'originalName and swapTargetName must differ' });
      return;
    }

    const written = await recordMany([
      {
        userId,
        ingredientName: body.originalName,
        eventType: 'swappedOut',
        recipeId: body.recipeId ?? null,
        swapTargetName: body.swapTargetName,
      },
      {
        userId,
        ingredientName: body.swapTargetName,
        eventType: 'swappedIn',
        recipeId: body.recipeId ?? null,
        swapTargetName: body.originalName,
      },
    ]);

    res.json({ persisted: written });
  } catch (err) {
    logger.error({ err }, 'IG6.1 recordSwapTap failed');
    res.status(500).json({ error: 'Failed to record swap event' });
  }
};
