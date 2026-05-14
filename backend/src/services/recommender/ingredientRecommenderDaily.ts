// ROADMAP 4.0 IG9.2 — Daily rollup of ingredient-surface recommender events.
//
// Aggregates the unified `recommenderEvent` stream (ingredient surfaces only)
// into per-user-per-day acceptance rates per source. Used by:
//   - IG10 Pantry IQ "your kitchen, reading itself" surface
//   - Tier M weekly synthesis
//
// TTL: raw RecommenderEvent rows expire at 90 days; this rollup is retained
// indefinitely so longitudinal trends survive the raw-event purge.
//
// Idempotent: re-runs for the same (userId, date) overwrite the prior rollup
// with set semantics (not increment) so a re-run doesn't double-count.

import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { parseJsonColumn } from '../../utils/jsonColumns';

/** Ingredient surfaces this rollup covers. Other surfaces are ignored. */
const INGREDIENT_SURFACES = [
  'ingredient_recommend',
  'ingredient_co_purchase',
  'pantry_iq',
] as const;

/** Source labels we know how to bucket. Anything else gets dropped. */
const KNOWN_SOURCES = [
  'cadence',
  'co_purchase',
  'embedding',
  'static',
  'user',
  'crowd',
  'cultural',
] as const;

const SURFACE_SET = new Set<string>(INGREDIENT_SURFACES);
const SOURCE_SET = new Set<string>(KNOWN_SOURCES);

interface SourceCounts {
  impressions: number;
  taps: number;
  accepts: number;
  dismisses: number;
}

function newCounts(): SourceCounts {
  return { impressions: 0, taps: 0, accepts: 0, dismisses: 0 };
}

function startOfUtcDay(d: Date): Date {
  const out = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  return out;
}

function nextUtcDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + 1);
  return out;
}

interface ParsedEvent {
  surface: string;
  eventType: string;
  source: string;
}

function parseEvent(row: { contextSnapshot: string }): ParsedEvent | null {
  let snap: any;
  try {
    snap = parseJsonColumn('contextSnapshot', row.contextSnapshot);
  } catch {
    return null;
  }
  if (!snap || typeof snap !== 'object') return null;
  const surface = typeof snap.surface === 'string' ? snap.surface : null;
  const eventType = typeof snap.eventType === 'string' ? snap.eventType : null;
  const source =
    snap.metadata && typeof snap.metadata.source === 'string'
      ? snap.metadata.source
      : null;
  if (!surface || !eventType || !source) return null;
  return { surface, eventType, source };
}

export interface RollupSummary {
  userId: string;
  date: Date;
  upsertedSources: string[];
  scanned: number;
  skipped: number;
}

export interface RollupForDateInput {
  userId: string;
  date: Date;
}

/**
 * Rolls up all ingredient-surface recommender events for a single user-day
 * into per-source counts. Idempotent.
 */
export async function rollupForDate(
  input: RollupForDateInput,
): Promise<RollupSummary> {
  if (!input.userId) {
    throw new Error('rollupForDate: userId required');
  }
  const dayStart = startOfUtcDay(input.date);
  const dayEnd = nextUtcDay(dayStart);

  const rows = (await (prisma as any).recommenderEvent.findMany({
    where: {
      userId: input.userId,
      asOf: { gte: dayStart, lt: dayEnd },
    },
    select: { contextSnapshot: true },
  })) as Array<{ contextSnapshot: string }>;

  const bySource = new Map<string, SourceCounts>();
  let skipped = 0;

  for (const row of rows) {
    const parsed = parseEvent(row);
    if (!parsed) {
      skipped += 1;
      continue;
    }
    if (!SURFACE_SET.has(parsed.surface)) continue;
    if (!SOURCE_SET.has(parsed.source)) {
      skipped += 1;
      continue;
    }
    const counts = bySource.get(parsed.source) ?? newCounts();
    switch (parsed.eventType) {
      case 'impression':
        counts.impressions += 1;
        break;
      case 'tap':
        counts.taps += 1;
        break;
      case 'accept':
        counts.accepts += 1;
        break;
      case 'dismiss':
        counts.dismisses += 1;
        break;
      default:
        // unknown event type — leave counts as-is. Future event types should
        // be added to KNOWN_EVENT_TYPES in recommenderEventSchema first.
        break;
    }
    bySource.set(parsed.source, counts);
  }

  const upsertedSources: string[] = [];
  for (const [source, counts] of bySource.entries()) {
    const acceptanceRate =
      counts.impressions > 0 ? counts.accepts / counts.impressions : null;
    try {
      await (prisma as any).ingredientRecommenderDaily.upsert({
        where: {
          userId_date_source: {
            userId: input.userId,
            date: dayStart,
            source,
          },
        },
        create: {
          userId: input.userId,
          date: dayStart,
          source,
          impressions: counts.impressions,
          taps: counts.taps,
          accepts: counts.accepts,
          dismisses: counts.dismisses,
          acceptanceRate,
        },
        update: {
          impressions: counts.impressions,
          taps: counts.taps,
          accepts: counts.accepts,
          dismisses: counts.dismisses,
          acceptanceRate,
        },
      });
      upsertedSources.push(source);
    } catch (err) {
      logger.warn(
        { err, userId: input.userId, source },
        'IG9.2 rollupForDate: upsert failed',
      );
    }
  }

  return {
    userId: input.userId,
    date: dayStart,
    upsertedSources,
    scanned: rows.length,
    skipped,
  };
}

export interface RollupForUserRangeInput {
  userId: string;
  /** Inclusive UTC day. */
  start: Date;
  /** Inclusive UTC day. */
  end: Date;
}

/**
 * Roll up every UTC day in [start, end] for one user. Sequential to keep
 * Prisma + SQLite happy — daily volumes are tiny.
 */
export async function rollupForUserRange(
  input: RollupForUserRangeInput,
): Promise<RollupSummary[]> {
  if (!input.userId) {
    throw new Error('rollupForUserRange: userId required');
  }
  const start = startOfUtcDay(input.start);
  const end = startOfUtcDay(input.end);
  if (end.getTime() < start.getTime()) {
    throw new Error('rollupForUserRange: end before start (range)');
  }
  const out: RollupSummary[] = [];
  for (
    let d = new Date(start);
    d.getTime() <= end.getTime();
    d = nextUtcDay(d)
  ) {
    const summary = await rollupForDate({ userId: input.userId, date: d });
    out.push(summary);
  }
  return out;
}

export const __INTERNALS = {
  INGREDIENT_SURFACES,
  KNOWN_SOURCES,
} as const;
