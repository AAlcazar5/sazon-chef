// backend/src/modules/today/cookPatternController.ts
// P4 retention — cook-pattern card.
//
// GET /api/today/cook-pattern
//
// Returns the user's dominant cook day-of-week IF today matches it
// (otherwise nullish so the frontend can render nothing). The card only
// fires on the day the pattern predicts — that's the joy-bar peak moment
// of "they get me", not a static stat surface.

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';
import {
  getCookPattern,
  type Weekday,
  type CookPattern,
} from '@/services/cookPatternService';

export interface CookPatternPayload {
  /** True when today === the user's dominant cook day. */
  matchesToday: boolean;
  /** Day name ("Tuesday") if a pattern was detected, else null. */
  dayName: string | null;
  /** Total cooks observed in the 60-day window. */
  totalCooks: number;
}

export function buildPayload(
  pattern: CookPattern,
  todayDow: Weekday,
): CookPatternPayload {
  return {
    matchesToday: pattern.dominantDay === todayDow,
    dayName: pattern.dominantDayName,
    totalCooks: pattern.totalCooks,
  };
}

export async function getCookPatternEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const pattern = await getCookPattern(userId, prisma);
    const todayDow = new Date().getDay() as Weekday;
    res.json(buildPayload(pattern, todayDow));
  } catch (error) {
    logger.error({ err: error }, 'cookPattern.endpoint.failed');
    res.json({ matchesToday: false, dayName: null, totalCooks: 0 });
  }
}
