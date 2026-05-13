// P4 retention — per-user cook-hour learning.
//
// The pre-dinner push fires hourly via the scheduler, but only users whose
// learned dinner hour matches the current hour should actually get pinged
// — that's the difference between a thoughtful nudge and a daily spam.
//
// Heuristic: take the user's CookingLog over the last 60 days, compute the
// median *evening* cook hour (16:00–22:00 local), default to 18:00 if
// nothing falls in that window or the user is too new to have history.
//
// Pure logic + thin DB wrapper. No state machine, no cron — recomputed on
// demand because the math is cheap and the hour can change as the user's
// routine evolves.

const DEFAULT_DINNER_HOUR = 18;
const MIN_COOKS_FOR_LEARNING = 3;
const EVENING_START = 16;
const EVENING_END = 22;
const MATCH_WINDOW = 1; // ± hours: a user's hour can fire on (h-1, h, h+1)

const HISTORY_LOOKBACK_DAYS = 60;

/** Pure picker — pulls the median *evening* cook hour from a list of cookedAts. */
export function pickCookHour(cookedAts: ReadonlyArray<Date>): number {
  const evening: number[] = [];
  for (const dt of cookedAts) {
    const h = dt.getHours();
    if (h >= EVENING_START && h <= EVENING_END) evening.push(h);
  }
  if (evening.length < MIN_COOKS_FOR_LEARNING) return DEFAULT_DINNER_HOUR;
  evening.sort((a, b) => a - b);
  const mid = Math.floor(evening.length / 2);
  return evening.length % 2 === 0
    ? Math.round((evening[mid - 1] + evening[mid]) / 2)
    : evening[mid];
}

/**
 * Decides whether the *current* server hour matches this user's learned
 * dinner hour (within ± MATCH_WINDOW). True = send the push now.
 */
export function shouldFireAtCurrentHour(
  userHour: number,
  currentHour: number,
): boolean {
  const diff = Math.abs(currentHour - userHour);
  return diff <= MATCH_WINDOW;
}

/**
 * Reads the user's cook history + returns their learned dinner hour. Falls
 * back to 18:00 for users with insufficient evening-cook data.
 */
// Minimal duck-typed Prisma signature — loosened so callers can pass
// either the real PrismaClient or a mock without the full type war.
type CookingLogClient = {
  cookingLog: { findMany: (args: any) => Promise<Array<{ cookedAt: Date }>> };
};

export async function getUserCookHour(
  userId: string,
  prisma: CookingLogClient,
  now: Date = new Date(),
): Promise<number> {
  const since = new Date(now.getTime() - HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const logs = await prisma.cookingLog.findMany({
    where: { userId, cookedAt: { gte: since } },
    select: { cookedAt: true },
    orderBy: { cookedAt: 'desc' },
  });
  return pickCookHour(logs.map((l) => l.cookedAt));
}

export const COOK_HOUR_DEFAULT = DEFAULT_DINNER_HOUR;
export const COOK_HOUR_MATCH_WINDOW = MATCH_WINDOW;
