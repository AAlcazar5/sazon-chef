// ROADMAP 4.0 IG3.1 — Per-user × per-ingredient cadence model.
//
// Computes mean inter-purchase days + std dev per ingredient from the
// IngredientEvent stream (purchased events only). Stored as a snapshot in
// `IngredientCadence` and refreshed on demand. Cold-start (≤ 2 events)
// records `confidence: 'low'`; downstream `predictRunningLow` (IG3.2)
// tightens its threshold accordingly.
//
// Cross-tier dovetail (IG3.2 + N9.1): predictRunningLow consumes this
// snapshot to flag pantry items where the user is overdue. The C12
// `running-low` notification template renders lifestyle-voice copy from
// the cadence + last-purchased timestamp via sazonVoiceService (N3).

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CadenceConfidence = 'low' | 'medium' | 'high';

export interface CadenceSnapshot {
  userId: string;
  ingredientName: string;
  meanIntervalDays: number | null;
  stdDevDays: number | null;
  lastPurchasedAt: Date | null;
  sampleCount: number;
  confidence: CadenceConfidence;
}

/**
 * Confidence buckets:
 *   low    = 0–2 purchase events (cold-start)
 *   medium = 3–4 events
 *   high   = 5+ events
 */
export function confidenceForSampleCount(n: number): CadenceConfidence {
  if (n <= 2) return 'low';
  if (n <= 4) return 'medium';
  return 'high';
}

interface PurchaseEvent {
  ingredientName: string;
  occurredAt: Date;
}

/**
 * Compute mean + std dev of inter-event intervals (days). Returns null when
 * there are fewer than 2 events (no interval to measure).
 */
function intervalStats(events: PurchaseEvent[]): {
  mean: number | null;
  stdDev: number | null;
} {
  if (events.length < 2) return { mean: null, stdDev: null };
  const intervals: number[] = [];
  for (let i = 1; i < events.length; i += 1) {
    const ms = events[i].occurredAt.getTime() - events[i - 1].occurredAt.getTime();
    intervals.push(ms / MS_PER_DAY);
  }
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (intervals.length < 2) return { mean, stdDev: 0 };
  const variance =
    intervals.reduce((acc, x) => acc + (x - mean) ** 2, 0) /
    (intervals.length - 1);
  return { mean, stdDev: Math.sqrt(variance) };
}

export interface ComputeCadenceInput {
  userId: string;
  ingredientName: string;
  /** Inject reference time for tests. */
  now?: Date;
}

/**
 * Pure function: returns the cadence snapshot for a single (user, ingredient)
 * pair without persisting. Useful when callers want to compute on the fly
 * (e.g. inside predictRunningLow without a separate DB read).
 */
export async function computeCadenceSnapshot(
  input: ComputeCadenceInput,
): Promise<CadenceSnapshot | null> {
  if (!input.userId) return null;
  if (!input.ingredientName) return null;
  const events = (await (prisma as any).ingredientEvent.findMany({
    where: {
      userId: input.userId,
      ingredientName: input.ingredientName,
      eventType: 'purchased',
    },
    orderBy: { occurredAt: 'asc' },
    select: { ingredientName: true, occurredAt: true },
  })) as PurchaseEvent[];

  if (events.length === 0) return null;

  const { mean, stdDev } = intervalStats(events);
  return {
    userId: input.userId,
    ingredientName: input.ingredientName,
    meanIntervalDays: mean,
    stdDevDays: stdDev,
    lastPurchasedAt: events[events.length - 1].occurredAt,
    sampleCount: events.length,
    confidence: confidenceForSampleCount(events.length),
  };
}

/**
 * Recompute and persist the cadence snapshot for a single ingredient.
 * Idempotent (upsert on the (userId, ingredientName) unique key).
 */
export async function refreshCadenceForIngredient(
  input: ComputeCadenceInput,
): Promise<CadenceSnapshot | null> {
  const snap = await computeCadenceSnapshot(input);
  if (!snap) return null;
  try {
    await (prisma as any).ingredientCadence.upsert({
      where: {
        userId_ingredientName: {
          userId: snap.userId,
          ingredientName: snap.ingredientName,
        },
      },
      create: {
        userId: snap.userId,
        ingredientName: snap.ingredientName,
        meanIntervalDays: snap.meanIntervalDays,
        stdDevDays: snap.stdDevDays,
        lastPurchasedAt: snap.lastPurchasedAt,
        sampleCount: snap.sampleCount,
        confidence: snap.confidence,
      },
      update: {
        meanIntervalDays: snap.meanIntervalDays,
        stdDevDays: snap.stdDevDays,
        lastPurchasedAt: snap.lastPurchasedAt,
        sampleCount: snap.sampleCount,
        confidence: snap.confidence,
      },
    });
  } catch (err) {
    logger.warn(
      { err, userId: snap.userId, ingredientName: snap.ingredientName },
      'IG3.1 refreshCadenceForIngredient persist failed',
    );
  }
  return snap;
}

/**
 * Recompute snapshots for every ingredient the user has purchased at least
 * once. Used by the nightly job. Returns the number of snapshots written.
 */
export async function refreshCadenceForUser(input: {
  userId: string;
}): Promise<number> {
  if (!input.userId) throw new Error('refreshCadenceForUser: userId required');
  const distinct = (await (prisma as any).ingredientEvent.findMany({
    where: { userId: input.userId, eventType: 'purchased' },
    distinct: ['ingredientName'],
    select: { ingredientName: true },
  })) as Array<{ ingredientName: string }>;
  let written = 0;
  for (const row of distinct) {
    const snap = await refreshCadenceForIngredient({
      userId: input.userId,
      ingredientName: row.ingredientName,
    });
    if (snap) written += 1;
  }
  return written;
}

// ── IG3.2 — predictRunningLow ─────────────────────────────────────────────

/**
 * Confidence-aware threshold for "running low":
 *   high   = 0.85 (overdue when (now-last)/mean ≥ 0.85)
 *   medium = 0.95
 *   low    = 1.05 (require past-mean before flagging — avoid false alarms)
 */
function thresholdForConfidence(confidence: CadenceConfidence): number {
  if (confidence === 'high') return 0.85;
  if (confidence === 'medium') return 0.95;
  return 1.05;
}

export interface RunningLowItem {
  ingredientName: string;
  /** Days since the last purchase. */
  daysSinceLastPurchase: number;
  /** Mean inter-purchase interval (days). */
  meanIntervalDays: number;
  /** (now - lastPurchase) / mean — 1.0 = exactly on cadence. */
  ratio: number;
  confidence: CadenceConfidence;
  lastPurchasedAt: Date;
}

export interface PredictRunningLowInput {
  userId: string;
  /** Reference time for the "now" comparison. Defaults to `new Date()`. */
  asOfDate?: Date;
  /** Restrict to a subset of ingredient names (e.g., only what's in pantry). */
  pantryNames?: string[];
}

/**
 * Returns ingredients where the user is overdue for a re-purchase. Items
 * without a cadence snapshot, without a `meanIntervalDays`, or below the
 * confidence-aware threshold are excluded.
 *
 * Cross-tier dovetail (N9.1): each row maps to a `running-low` notification
 * template; tapping the notification deep-links to a Today / Kitchen
 * surface that confirms the suggestion.
 */
export async function predictRunningLow(
  input: PredictRunningLowInput,
): Promise<RunningLowItem[]> {
  if (!input.userId) return [];
  const now = input.asOfDate ?? new Date();

  const where: Record<string, unknown> = {
    userId: input.userId,
    meanIntervalDays: { not: null },
    lastPurchasedAt: { not: null },
  };
  if (input.pantryNames && input.pantryNames.length > 0) {
    where.ingredientName = { in: input.pantryNames };
  }

  const rows = (await (prisma as any).ingredientCadence.findMany({
    where,
  })) as Array<{
    ingredientName: string;
    meanIntervalDays: number;
    lastPurchasedAt: Date;
    confidence: string;
  }>;

  const out: RunningLowItem[] = [];
  for (const r of rows) {
    const days = (now.getTime() - r.lastPurchasedAt.getTime()) / MS_PER_DAY;
    if (r.meanIntervalDays <= 0) continue;
    const ratio = days / r.meanIntervalDays;
    const confidence = r.confidence as CadenceConfidence;
    if (ratio >= thresholdForConfidence(confidence)) {
      out.push({
        ingredientName: r.ingredientName,
        daysSinceLastPurchase: days,
        meanIntervalDays: r.meanIntervalDays,
        ratio,
        confidence,
        lastPurchasedAt: r.lastPurchasedAt,
      });
    }
  }
  // Most overdue first.
  out.sort((a, b) => b.ratio - a.ratio);
  return out;
}

/** Read a snapshot (without recomputing). Returns null when absent. */
export async function getCadence(
  userId: string,
  ingredientName: string,
): Promise<CadenceSnapshot | null> {
  if (!userId || !ingredientName) return null;
  const row = (await (prisma as any).ingredientCadence.findUnique({
    where: { userId_ingredientName: { userId, ingredientName } },
  })) as {
    userId: string;
    ingredientName: string;
    meanIntervalDays: number | null;
    stdDevDays: number | null;
    lastPurchasedAt: Date | null;
    sampleCount: number;
    confidence: string;
  } | null;
  if (!row) return null;
  return {
    userId: row.userId,
    ingredientName: row.ingredientName,
    meanIntervalDays: row.meanIntervalDays,
    stdDevDays: row.stdDevDays,
    lastPurchasedAt: row.lastPurchasedAt,
    sampleCount: row.sampleCount,
    confidence: row.confidence as CadenceConfidence,
  };
}
