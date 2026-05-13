// P3 retention — engagement-aware push budget.
//
// Heavy users open the app multiple times a day on their own — they don't
// need pre-dinner nudges, drought reminders, or weekly digest pings.
// Suppressing those keeps the lifetime push count low for the people who
// would mute notifications first if we over-send.
//
// Light + lapsed users keep getting the full set; they're the ones the
// pushes are written for.
//
// Critical pushes (shopping list ready, plan ready, expiry, coach
// check-in) always bypass this gate — they're tied to user-initiated
// actions or perishable state, not engagement-pacing.

import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

const HEAVY_USAGE_VIEWS_PER_WEEK = 21; // ~3 recipe-views/day
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns `true` if the user is engaged enough that we should suppress
 * non-critical pushes this week. Uses RecipeView count over the last 7
 * days as the signal — same data the lapsed-user check reads from.
 */
export async function isHeavyEngagement(
  userId: string,
  now: Date = new Date(),
): Promise<boolean> {
  try {
    const since = new Date(now.getTime() - WINDOW_MS);
    const count = await prisma.recipeView.count({
      where: { userId, viewedAt: { gte: since } },
    });
    return count >= HEAVY_USAGE_VIEWS_PER_WEEK;
  } catch (error) {
    // Fail open — if we can't read engagement, deliver the push. Better
    // a slightly-louder app than a totally-quiet one.
    logger.warn({ err: error, userId }, 'engagementGate.read.failed');
    return false;
  }
}

/**
 * Reverse helper, for readability at call sites:
 *   `if (!(await shouldSendNonCriticalPush(userId))) return;`
 */
export async function shouldSendNonCriticalPush(
  userId: string,
  now: Date = new Date(),
): Promise<boolean> {
  return !(await isHeavyEngagement(userId, now));
}

export const ENGAGEMENT_GATE_HEAVY_THRESHOLD = HEAVY_USAGE_VIEWS_PER_WEEK;
