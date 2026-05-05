// backend/src/services/surfaceYieldService.ts
// ROADMAP 4.0 Tier B3 — Per-surface signal-yield instrumentation.
//
// Single event log for every recommendation surface in the app. Daily
// aggregation tells us which surfaces are noise (low yield) and which are
// pulling weight. Surfaces below threshold over 7 days are flagged for review.

import { prisma } from '../lib/prisma';

export const SURFACES = [
  'today_hero',
  'week_swap',
  'kitchen_discover',
  'sazon_tool',
  'smart_collection',
  'cravings_made_real',
  'new_to_you',
  'browse_by_family',
  'other',
] as const;

export type Surface = (typeof SURFACES)[number];

export const ACTIONS = ['impression', 'tap', 'cook', 'rate'] as const;
export type SurfaceAction = (typeof ACTIONS)[number];

export interface RecordSurfaceEventInput {
  userId: string;
  surface: Surface | string;
  action: SurfaceAction | string;
  recipeId?: string | null;
  variant?: string | null;
}

export interface SurfaceYieldRow {
  surface: string;
  asOfDate: Date;
  variant: string | null;
  impressions: number;
  taps: number;
  cooks: number;
  rates: number;
  signalYield: number;
}

interface ComputeOptions {
  surface: Surface | string;
  asOfDate: Date;
  /** Window size in days. Default 1 (daily snapshot). */
  windowDays?: number;
  /** Optional variant filter for B4 A/B reads. */
  variant?: string | null;
  persist: boolean;
}

const MIN_MEANINGFUL_IMPRESSIONS = 50;
const LOW_YIELD_THRESHOLD = 0.05;

/**
 * Persist a single recommendation-surface event. Called inline anywhere a
 * recommendation is shown (impression), opened (tap), cooked, or rated.
 */
export async function recordSurfaceEvent(input: RecordSurfaceEventInput): Promise<void> {
  if (!SURFACES.includes(input.surface as Surface)) {
    throw new Error(`recordSurfaceEvent: unknown surface "${input.surface}"`);
  }
  if (!ACTIONS.includes(input.action as SurfaceAction)) {
    throw new Error(`recordSurfaceEvent: unknown action "${input.action}"`);
  }

  await (prisma as any).surfaceEvent.create({
    data: {
      userId: input.userId,
      surface: input.surface,
      action: input.action,
      recipeId: input.recipeId ?? null,
      variant: input.variant ?? null,
    },
  });
}

/**
 * Compute the funnel + yield for a single surface over a window.
 */
export async function computeSurfaceYield(opts: ComputeOptions): Promise<SurfaceYieldRow> {
  const { surface, asOfDate, windowDays = 1, variant, persist } = opts;
  const since = new Date(asOfDate.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    surface,
    createdAt: { gte: since, lte: asOfDate },
  };
  if (variant !== undefined) {
    where.variant = variant;
  }

  const grouped = (await (prisma as any).surfaceEvent.groupBy({
    by: ['action'],
    where,
    _count: { _all: true },
  })) as Array<{ action: string; _count: { _all: number } }>;

  const counts: Record<string, number> = { impression: 0, tap: 0, cook: 0, rate: 0 };
  for (const row of grouped) {
    counts[row.action] = row._count._all;
  }

  const impressions = counts.impression;
  const taps = counts.tap;
  const cooks = counts.cook;
  const rates = counts.rate;
  const signalYield = impressions > 0 ? (cooks + rates) / impressions : 0;

  const snapshot: SurfaceYieldRow = {
    surface,
    asOfDate,
    variant: variant ?? null,
    impressions,
    taps,
    cooks,
    rates,
    signalYield,
  };

  if (persist) {
    await (prisma as any).surfaceYieldSnapshot.upsert({
      where: {
        surface_asOfDate_variant: {
          surface,
          asOfDate,
          variant: variant ?? null,
        },
      },
      create: snapshot,
      update: snapshot,
    });
  }

  return snapshot;
}

/**
 * Compute yields for every known surface in one pass (daily cron use case).
 */
export async function computeAllSurfaceYields(opts: {
  asOfDate: Date;
  windowDays?: number;
  persist: boolean;
}): Promise<SurfaceYieldRow[]> {
  const results: SurfaceYieldRow[] = [];
  for (const surface of SURFACES) {
    results.push(
      await computeSurfaceYield({
        surface,
        asOfDate: opts.asOfDate,
        windowDays: opts.windowDays,
        persist: opts.persist,
      })
    );
  }
  return results;
}

/**
 * Flag a surface as low-yield. Requires a minimum number of impressions to
 * avoid noise from infrequent surfaces.
 */
export function isLowYieldSurface(snapshot: { impressions: number; signalYield: number }): boolean {
  if (snapshot.impressions < MIN_MEANINGFUL_IMPRESSIONS) return false;
  return snapshot.signalYield < LOW_YIELD_THRESHOLD;
}
