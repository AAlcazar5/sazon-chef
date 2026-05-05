// backend/src/services/userSignalCoverageService.ts
// ROADMAP 4.0 Tier B1 — Per-user signal-coverage telemetry.
//
// Daily snapshot of how much personalization signal a user has generated over
// a rolling window. Drives "low-signal user" interventions and feeds the
// cohort distance metric (B2). Surfaces with low yield are noise — kill or
// rework.

import { prisma } from '../lib/prisma';

export interface UserSignalCounts {
  userId: string;
  period: number;
  cooks: number;
  ratings: number;
  swaps: number;
  utterances: number;
  leftoverDecisions: number;
  photoUploads: number;
  tasteFeedback: number;
  cravingSearches: number;
  preCookCheckIns: number;
  postCookNutritionViews: number;
  totalSignals: number;
  computedAt: Date;
}

const SUPPORTED_PERIODS = [7, 30, 90] as const;
type SupportedPeriod = (typeof SUPPORTED_PERIODS)[number];

const LOW_SIGNAL_THRESHOLD: Record<SupportedPeriod, number> = {
  7: 5,
  30: 15,
  90: 30,
};

/**
 * Computes a fresh signal-coverage snapshot for a single user over a rolling
 * `period` (in days). Persists via upsert keyed on (userId, period, computedAt).
 *
 * Signals not yet wired to a tracking table (swaps, utterances, photoUploads,
 * preCookCheckIns, postCookNutritionViews) report 0. They populate as the
 * underlying logs come online (Tier C7 daily check-in, etc.).
 */
export async function computeUserSignalSnapshot(
  userId: string,
  period: number,
  asOf: Date = new Date()
): Promise<UserSignalCounts> {
  if (period <= 0 || !Number.isFinite(period)) {
    throw new Error(`computeUserSignalSnapshot: period must be positive, got ${period}`);
  }

  const since = new Date(asOf.getTime() - period * 24 * 60 * 60 * 1000);
  const range = { gte: since, lte: asOf };

  const [cooks, ratings, tasteFeedback, cravingSearches, leftoverDecisions] = await Promise.all([
    (prisma as any).cookingLog.count({
      where: { userId, cookedAt: range },
    }),
    (prisma as any).recipeFeedback.count({
      where: { userId, createdAt: range },
    }),
    // tasteFeedback = liked OR disliked subset (the affective dimension)
    (prisma as any).recipeFeedback.count({
      where: {
        userId,
        createdAt: range,
        OR: [{ liked: true }, { disliked: true }],
      },
    }),
    (prisma as any).cravingSearchEvent.count({
      where: { userId, createdAt: range },
    }),
    (prisma as any).leftoverInventory.count({
      where: { userId, createdAt: range },
    }),
  ]);

  const swaps = 0;
  const utterances = 0;
  const photoUploads = 0;
  const preCookCheckIns = 0;
  const postCookNutritionViews = 0;

  const totalSignals =
    cooks +
    ratings +
    tasteFeedback +
    cravingSearches +
    leftoverDecisions +
    swaps +
    utterances +
    photoUploads +
    preCookCheckIns +
    postCookNutritionViews;

  const snapshotData = {
    userId,
    period,
    cooks,
    ratings,
    swaps,
    utterances,
    leftoverDecisions,
    photoUploads,
    tasteFeedback,
    cravingSearches,
    preCookCheckIns,
    postCookNutritionViews,
    totalSignals,
    computedAt: asOf,
  };

  await (prisma as any).userSignalSnapshot.upsert({
    where: {
      userId_period_computedAt: {
        userId,
        period,
        computedAt: asOf,
      },
    },
    create: snapshotData,
    update: snapshotData,
  });

  return snapshotData;
}

/**
 * Flag a snapshot as "low signal" — the user is getting a generic experience
 * and is likely to churn. Thresholds tuned against the typical onboarding
 * arc; anything below is an intervention candidate (Coach nudge, signal-
 * collection prompt, onboarding revisit).
 */
export function isLowSignal(snapshot: { period: number; totalSignals: number }): boolean {
  const threshold = LOW_SIGNAL_THRESHOLD[snapshot.period as SupportedPeriod];
  if (threshold === undefined) {
    // Conservative default — flag for review when we don't recognise the window.
    return true;
  }
  return snapshot.totalSignals < threshold;
}
