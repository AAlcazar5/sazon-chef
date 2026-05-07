// ROADMAP 4.0 IG4.3 — GET /api/pantry/expiring controller.

import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { getUserId } from '../../utils/authHelper';
import { getExpiringPantryItems } from '../../services/pantryExpiryService';
import { expiringPrompt } from '../../services/sazonVoiceService';

const MAX_WITHIN_DAYS = 14;

/** GET /api/pantry/expiring?withinDays=3 */
export const getExpiringPantryItemsRoute = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const withinRaw = (req.query.withinDays ?? '') as string;
    const parsed = Number.parseInt(withinRaw, 10);
    const withinDays = Number.isFinite(parsed) && parsed > 0
      ? Math.min(parsed, MAX_WITHIN_DAYS)
      : 3;

    const items = await getExpiringPantryItems({ userId, withinDays });
    const enriched = items.map((it) => ({
      ...it,
      // N3.2 — server-formatted lifestyle prose; frontend renders verbatim.
      prompt: expiringPrompt({
        ingredientName: it.name,
        source: 'pantry',
      }),
    }));

    res.json({ items: enriched });
  } catch (err) {
    logger.error({ err }, 'IG4.3 getExpiringPantryItems failed');
    res.status(500).json({ error: 'Failed to load expiring pantry items' });
  }
};
