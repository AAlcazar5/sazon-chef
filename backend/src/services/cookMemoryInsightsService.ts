// backend/src/services/cookMemoryInsightsService.ts
//
// X-C1 (founder roadmap Tier X — Moat Hardening): the derived-insight
// layer. The Cook Log is the moat substrate; this service is the first
// queryable composition over it. COMPOSES existing services (does NOT
// duplicate their logic):
//
//   - cookPatternService.getCookPattern  — cadence (dominant cook day)
//   - cookRecapInsightService.computeCookRecapInsight — cuisine cadence
//   - CookEvent type='swap'    payloads      — substitution fingerprint
//   - CookEvent type='outcome' payloads      — flops
//
// Returns null for honest-empty (matches MemoryMirrorLead's contract —
// the consumer renders NOTHING, not a placeholder).
//
// W-D1 invariant: no totals/denominators in user-facing copy. The
// numeric fields here are for the rendering layer to interpret as
// qualitative signals ("a couple", "a few", "your most-swapped pair"),
// never to display verbatim as "you cooked 17 times this month."

import { prisma } from '../lib/prisma';
import { getCookPattern, type CookPattern } from './cookPatternService';
import { computeCookRecapInsight } from './cookRecapInsightService';

export interface SubstitutionFingerprint {
  /** Lowercased original ingredient that was swapped OUT. */
  from: string;
  /** Lowercased replacement ingredient that was swapped IN. */
  to: string;
  /** How many times this exact pair was logged. Used for ranking only;
   *  rendering layer translates to qualitative copy. */
  count: number;
}

export interface CookMemoryInsight {
  /** Cadence — which day of the week the user gravitates toward. Null
   *  when the user hasn't established a pattern yet (cold-start). */
  cadence: CookPattern;
  /** Cuisine-cadence insight string (e.g. "Third Persian dish this
   *  month.") or null when no streak applies. Comes pre-formatted from
   *  cookRecapInsightService — we forward it as-is. */
  cuisineCadence: string | null;
  /** Top swap pairs the user has logged via CookEvent type='swap',
   *  ranked by count (descending). Caps at 3 — the user's substitution
   *  *fingerprint*, not a full audit log. */
  substitutions: SubstitutionFingerprint[];
  /** Number of recent flops (CookEvent type='outcome' with
   *  payload.rating === 'flop' OR payload.outcome === 'flop'). The
   *  renderer interprets this qualitatively — never display the raw
   *  count to the user. */
  flopsRecent: number;
}

/** Default empty insight — same shape as a populated one but all
 *  signals null/empty. Caller treats null OR this shape interchangeably;
 *  exported so the renderer can use it as a `??` fallback. */
export const EMPTY_COOK_MEMORY_INSIGHT: CookMemoryInsight = {
  cadence: { dominantDay: null, dominantDayName: null, totalCooks: 0 },
  cuisineCadence: null,
  substitutions: [],
  flopsRecent: 0,
};

const SUBSTITUTION_TOP_N = 3;
const FLOP_WINDOW_DAYS = 60;

type PrismaCookingLogClient = {
  cookingLog: {
    findMany: (args: {
      where: { userId: string; cookedAt?: { gte: Date } };
      select: { cookedAt: true; recipe?: { select: { cuisine: true } } };
      orderBy?: { cookedAt: 'desc' };
      take?: number;
    }) => Promise<
      Array<{ cookedAt: Date; recipe?: { cuisine: string | null } | null }>
    >;
  };
};

type PrismaCookEventClient = {
  cookEvent: {
    findMany: (args: {
      where: { userId: string; type: string; createdAt?: { gte: Date } };
      select: { payload: true; createdAt: true };
    }) => Promise<Array<{ payload: string; createdAt: Date }>>;
  };
};

type PrismaInsightsClient = PrismaCookingLogClient & PrismaCookEventClient;

interface BuildInput {
  userId: string;
  /** Optional injected prisma — defaults to the module global. Lets
   *  tests pass the shared mock without poking the module cache. */
  prisma?: PrismaInsightsClient;
  /** Optional fixed "now" for deterministic tests. */
  now?: Date;
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function extractSubstitutions(
  rows: Array<{ payload: string }>,
): SubstitutionFingerprint[] {
  const counts = new Map<string, { from: string; to: string; count: number }>();
  for (const row of rows) {
    const parsed = safeJsonParse(row.payload);
    if (!parsed) continue;
    const from =
      typeof parsed.from === 'string' && parsed.from.length > 0
        ? parsed.from.trim().toLowerCase()
        : null;
    const to =
      typeof parsed.to === 'string' && parsed.to.length > 0
        ? parsed.to.trim().toLowerCase()
        : null;
    if (!from || !to) continue;
    const key = `${from}␟${to}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { from, to, count: 1 });
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      // Stable tie-break: alphabetical on (from, to).
      const fromCmp = a.from.localeCompare(b.from);
      if (fromCmp !== 0) return fromCmp;
      return a.to.localeCompare(b.to);
    })
    .slice(0, SUBSTITUTION_TOP_N);
}

function countFlops(rows: Array<{ payload: string }>): number {
  let n = 0;
  for (const row of rows) {
    const parsed = safeJsonParse(row.payload);
    if (!parsed) continue;
    const rating = typeof parsed.rating === 'string' ? parsed.rating.toLowerCase() : '';
    const outcome = typeof parsed.outcome === 'string' ? parsed.outcome.toLowerCase() : '';
    if (rating === 'flop' || outcome === 'flop') n += 1;
  }
  return n;
}

/**
 * Compute the composed insight for a user. Returns `null` when the user
 * has NO cook history at all — the consumer renders nothing (matches
 * MemoryMirrorLead's empty contract).
 */
export async function computeCookMemoryInsight(
  input: BuildInput,
): Promise<CookMemoryInsight | null> {
  if (!input.userId) return null;
  const db = (input.prisma ?? (prisma as unknown as PrismaInsightsClient));
  const now = input.now ?? new Date();

  // Cadence — delegates to cookPatternService (composition, no dup).
  // cookPatternService takes its prisma as a parameter, so we forward.
  const cadence = await getCookPattern(input.userId, db as never, now);

  // Most-recent cook → feeds the cuisine-cadence recap. Skip the call
  // entirely when there's no cook on record.
  const recentRows = await db.cookingLog.findMany({
    where: { userId: input.userId },
    select: { cookedAt: true, recipe: { select: { cuisine: true } } },
    orderBy: { cookedAt: 'desc' },
    take: 1,
  });
  let cuisineCadence: string | null = null;
  const recentCuisine = recentRows[0]?.recipe?.cuisine;
  if (typeof recentCuisine === 'string' && recentCuisine.length > 0) {
    cuisineCadence = await computeCookRecapInsight({
      userId: input.userId,
      cuisine: recentCuisine,
      asOfDate: now,
    });
  }

  // Substitution fingerprint — last 60 days of swap events.
  const flopWindowStart = new Date(
    now.getTime() - FLOP_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const swapRows = await db.cookEvent.findMany({
    where: {
      userId: input.userId,
      type: 'swap',
      createdAt: { gte: flopWindowStart },
    },
    select: { payload: true, createdAt: true },
  });
  const substitutions = extractSubstitutions(swapRows);

  // Flops — last 60 days of outcome events with rating/outcome='flop'.
  const outcomeRows = await db.cookEvent.findMany({
    where: {
      userId: input.userId,
      type: 'outcome',
      createdAt: { gte: flopWindowStart },
    },
    select: { payload: true, createdAt: true },
  });
  const flopsRecent = countFlops(outcomeRows);

  // Honest-empty contract: if NOTHING fired (no cadence pattern, no
  // cuisine cadence, no swaps, no flops), return null so the consumer
  // renders nothing rather than a placeholder card.
  const hasAnything =
    cadence.totalCooks > 0 ||
    !!cuisineCadence ||
    substitutions.length > 0 ||
    flopsRecent > 0;
  if (!hasAnything) return null;

  return {
    cadence,
    cuisineCadence,
    substitutions,
    flopsRecent,
  };
}
