// backend/src/modules/today/cuisineDroughtController.ts
// P1 retention — Today-surface companion to the cuisine-drought push.
//
// GET /api/today/drought
//
// Returns the user's top-3 cuisine that has gone 7+ days quiet, or null
// if no qualifying drought exists. Same selection logic as
// notificationTriggerService.checkCuisineDrought — surfaced as a card on
// Today so the nudge is reachable in-app, not only via push.

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';

export interface CuisineDroughtPayload {
  cuisine: string | null;
  daysSince: number | null;
}

/**
 * Pure selection logic — exported for unit testing without a request mock.
 */
export function pickDroughtCuisine(
  logs: ReadonlyArray<{ cookedAt: Date; recipe: { cuisine: string | null } | null }>,
  now: Date = new Date(),
): CuisineDroughtPayload {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const stats = new Map<string, { count: number; latest: Date }>();
  for (const log of logs) {
    const c = log.recipe?.cuisine?.trim();
    if (!c) continue;
    const existing = stats.get(c);
    if (existing) {
      existing.count += 1;
      if (log.cookedAt > existing.latest) existing.latest = log.cookedAt;
    } else {
      stats.set(c, { count: 1, latest: log.cookedAt });
    }
  }

  const ranked = Array.from(stats.entries())
    .filter(([, s]) => s.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .filter(([, s]) => s.latest < sevenDaysAgo);

  if (ranked.length === 0) return { cuisine: null, daysSince: null };

  const [cuisine, droughtStats] = ranked[0];
  const daysSince = Math.floor(
    (now.getTime() - droughtStats.latest.getTime()) / (24 * 60 * 60 * 1000),
  );
  return { cuisine, daysSince };
}

export async function getCuisineDrought(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const logs = await prisma.cookingLog.findMany({
      where: { userId, cookedAt: { gte: sixtyDaysAgo } },
      orderBy: { cookedAt: 'desc' },
      select: { cookedAt: true, recipe: { select: { cuisine: true } } },
    });

    const payload = pickDroughtCuisine(logs);
    res.json(payload);
  } catch (error) {
    logger.error({ err: error }, 'cuisineDrought.failed');
    res.json({ cuisine: null, daysSince: null });
  }
}
