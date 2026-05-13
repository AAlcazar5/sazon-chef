// P4 retention — cook-pattern detection.
//
// Reads a user's CookingLog and identifies the day(s) of week they cook on
// disproportionately often. Surface used by the Today screen to render a
// "You usually cook Tuesday nights" card when today matches their pattern.
//
// Pure helper + thin DB wrapper. No state machine, no cron — recomputed on
// demand because the cook history is small per user and the math is cheap.

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const WEEKDAY_NAMES: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export interface CookPattern {
  /** The user's dominant cook weekday (0=Sun, 6=Sat) — or null when none stands out. */
  dominantDay: Weekday | null;
  /** Human-readable name of the dominant day ("Tuesday"). */
  dominantDayName: string | null;
  /** Total cooks observed in the window. */
  totalCooks: number;
}

const MIN_COOKS_FOR_PATTERN = 6;
const DOMINANCE_THRESHOLD = 0.25; // top day must be ≥25% of all cooks

/**
 * Pure picker — exported for unit testing.
 */
export function pickCookPattern(
  cookedAts: ReadonlyArray<Date>,
): CookPattern {
  if (cookedAts.length < MIN_COOKS_FOR_PATTERN) {
    return { dominantDay: null, dominantDayName: null, totalCooks: cookedAts.length };
  }

  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const dt of cookedAts) {
    const d = dt.getDay() as Weekday;
    counts[d] = (counts[d] ?? 0) + 1;
  }

  let topDay: Weekday = 0;
  let topCount = -1;
  for (let d = 0; d < 7; d++) {
    if (counts[d] > topCount) {
      topCount = counts[d];
      topDay = d as Weekday;
    }
  }

  const share = topCount / cookedAts.length;
  if (share < DOMINANCE_THRESHOLD) {
    return { dominantDay: null, dominantDayName: null, totalCooks: cookedAts.length };
  }

  return {
    dominantDay: topDay,
    dominantDayName: WEEKDAY_NAMES[topDay],
    totalCooks: cookedAts.length,
  };
}

type CookingLogClient = {
  cookingLog: { findMany: (args: any) => Promise<Array<{ cookedAt: Date }>> };
};

/**
 * Lookup the pattern for a user from the last 60 days of cooking history.
 * Returns a recognized pattern OR a "null" payload (`dominantDay=null`)
 * when the user doesn't have enough cooks or no day stands out.
 */
export async function getCookPattern(
  userId: string,
  prisma: CookingLogClient,
  now: Date = new Date(),
): Promise<CookPattern> {
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const logs = await prisma.cookingLog.findMany({
    where: { userId, cookedAt: { gte: sixtyDaysAgo } },
    select: { cookedAt: true },
    orderBy: { cookedAt: 'desc' },
  });
  return pickCookPattern(logs.map((l) => l.cookedAt));
}

export const COOK_PATTERN_MIN_COOKS = MIN_COOKS_FOR_PATTERN;
export const COOK_PATTERN_DOMINANCE = DOMINANCE_THRESHOLD;
