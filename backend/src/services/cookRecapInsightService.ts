// backend/src/services/cookRecapInsightService.ts
// ROADMAP 4.0 Tier J16 — Auto-generated cook recap line.
//
// Returns at most one short retrospective insight to be rendered above the
// cook-complete celebration (J14 / J15). Pulled from the user's recent cooking
// history. Hard cap: one line per cook to keep peaks sharp. Returns null when
// no insight applies — the caller renders nothing in that case (silent
// fall-through is the intended behavior).
//
// Insight ranking (rarer wins):
//   1. Consecutive-weeks-streak ("You and Lebanese cuisine — third week in a
//      row.")
//   2. Monthly cuisine count ("Third Persian dish this month.")
//
// First-time-with-ingredient is intentionally deferred: it requires ingredient
// tagging across the catalog that does not yet exist as a queryable signal.
// Will land when the recipe-content-strategy ingredient pipeline ships.

import { prisma } from '../lib/prisma';

export interface CookRecapInsightInput {
  userId: string;
  cuisine: string;
  asOfDate: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTHLY_WINDOW_DAYS = 30;
const STREAK_MIN_WEEKS = 3;

const ORDINALS_LOWERCASE = [
  '',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
];

export async function computeCookRecapInsight(
  input: CookRecapInsightInput,
): Promise<string | null> {
  if (!input.userId) return null;

  const cuisine = (input.cuisine ?? '').trim();
  if (!cuisine) return null;

  const asOfDate = input.asOfDate ?? new Date();
  const cuisineLower = cuisine.toLowerCase();
  const cuisineDisplay = capitalize(cuisine);

  const monthlyWindowStart = new Date(asOfDate.getTime() - MONTHLY_WINDOW_DAYS * MS_PER_DAY);

  // One query covers both the monthly-count and the streak signals.
  const rows = (await (prisma as unknown as {
    cookingLog: {
      findMany: (args: unknown) => Promise<
        Array<{ recipe: { cuisine: string | null } | null; cookedAt: Date }>
      >;
    };
  }).cookingLog.findMany({
    where: {
      userId: input.userId,
      cookedAt: { gte: monthlyWindowStart, lt: asOfDate },
    },
    select: {
      recipe: { select: { cuisine: true } },
      cookedAt: true,
    },
  })) as Array<{ recipe: { cuisine: string | null } | null; cookedAt: Date }>;

  // Filter to the target cuisine (case-insensitive). Apply a defensive
  // date-window filter on top of the Prisma where clause — protects the
  // recap copy if a stale cached row ever leaks past the query.
  const matchedCooks = rows.filter(
    (r) =>
      r?.recipe?.cuisine?.trim().toLowerCase() === cuisineLower &&
      r.cookedAt >= monthlyWindowStart &&
      r.cookedAt < asOfDate,
  );

  // Streak first — rarer signal wins.
  const streakWeeks = countConsecutiveWeekStreak(matchedCooks, asOfDate);
  if (streakWeeks >= STREAK_MIN_WEEKS) {
    const ord = ordinal(streakWeeks);
    return `You and ${cuisineDisplay} cuisine — ${ord} week in a row.`;
  }

  // Monthly count — current cook is +1 over the historical window.
  const countIncludingThisCook = matchedCooks.length + 1;
  if (countIncludingThisCook >= 3) {
    const ord = ordinal(countIncludingThisCook);
    return `${capitalize(ord)} ${cuisineDisplay} dish this month.`;
  }

  return null;
}

/**
 * Count of consecutive ISO weeks immediately preceding `asOfDate` in which the
 * user cooked the same cuisine, plus one for the current (this-cook) week.
 *
 * Example: cooks in week-of-2026-04-22 and week-of-2026-04-29 with `asOfDate`
 * landing in week-of-2026-05-06 → returns 3 (two prior + this one).
 */
function countConsecutiveWeekStreak(
  cooks: Array<{ cookedAt: Date }>,
  asOfDate: Date,
): number {
  if (cooks.length === 0) return 1; // just this cook, no streak
  const weeksWithCooks = new Set<string>();
  weeksWithCooks.add(isoWeekKey(asOfDate)); // include current week
  for (const c of cooks) {
    weeksWithCooks.add(isoWeekKey(c.cookedAt));
  }

  let streak = 1; // current week counted
  let cursor = isoWeekStart(asOfDate);
  // Walk backwards one week at a time as long as the prior week is in the set.
  // Hard guard: cooks beyond the monthly query window can't contribute, so
  // 5 weeks is a strict ceiling for the current MONTHLY_WINDOW_DAYS config.
  const maxWeeks = Math.ceil(MONTHLY_WINDOW_DAYS / 7) + 1;
  for (let i = 0; i < maxWeeks; i += 1) {
    cursor = new Date(cursor.getTime() - 7 * MS_PER_DAY);
    const key = isoWeekKey(cursor);
    if (weeksWithCooks.has(key)) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

/** UTC ISO-week Monday 00:00 for the given instant. */
function isoWeekStart(d: Date): Date {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

function isoWeekKey(d: Date): string {
  const ws = isoWeekStart(d);
  return `${ws.getUTCFullYear()}-${String(ws.getUTCMonth() + 1).padStart(2, '0')}-${String(ws.getUTCDate()).padStart(2, '0')}`;
}

function ordinal(n: number): string {
  if (n <= 0) return '';
  if (n < ORDINALS_LOWERCASE.length) return ORDINALS_LOWERCASE[n];
  // Fallback for unusual large counts: use numeric ordinal.
  const suffix = n % 10 === 1 && n % 100 !== 11 ? 'st' :
                 n % 10 === 2 && n % 100 !== 12 ? 'nd' :
                 n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
