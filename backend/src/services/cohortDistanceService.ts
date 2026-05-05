// backend/src/services/cohortDistanceService.ts
// ROADMAP 4.0 Tier B2 — Cohort distance metric.
//
// Pairwise Jaccard distance between users' Today hero recommendation sets at
// d7/d30/d90 lookbacks. If the median distance isn't increasing over time,
// personalization is converging — every user is seeing the same content.
//
// We use RecipeView as the source-of-truth set per user (impressions of
// recipes — the proxy for "what the algorithm surfaced to them"). When the
// per-surface event log lands (B3), this service can be re-pointed at
// `surface = today_hero` events specifically.

import { prisma } from '../lib/prisma';

const MIN_SAMPLE_SIZE = 10;

export interface CohortDistanceSnapshot {
  cohortId: string;
  asOfDate: Date;
  d7Median: number;
  d30Median: number;
  d90Median: number;
  sampleSize: number;
}

interface ComputeOptions {
  cohortId: string;
  asOfDate: Date;
  persist: boolean;
}

export function jaccardDistance<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  if (a.size === 0 || b.size === 0) return 1;
  let intersection = 0;
  a.forEach((v) => {
    if (b.has(v)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  const similarity = intersection / union;
  return 1 - similarity;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error('median: cannot compute median of empty array');
  }
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Compute every n*(n-1)/2 pairwise Jaccard distance between users.
 * Returns an empty array for fewer than 2 users.
 */
export function pairwiseDistances<T>(userSets: Map<string, Set<T>>): number[] {
  const ids = [...userSets.keys()];
  const distances: number[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const setA = userSets.get(ids[i])!;
      const setB = userSets.get(ids[j])!;
      distances.push(jaccardDistance(setA, setB));
    }
  }
  return distances;
}

interface RawView {
  userId: string;
  recipeId: string;
  viewedAt: Date;
}

function buildUserSets(views: RawView[], windowDays: number, asOfDate: Date): Map<string, Set<string>> {
  const since = new Date(asOfDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const sets = new Map<string, Set<string>>();
  for (const v of views) {
    if (v.viewedAt < since) continue;
    if (v.viewedAt > asOfDate) continue;
    let s = sets.get(v.userId);
    if (!s) {
      s = new Set<string>();
      sets.set(v.userId, s);
    }
    s.add(v.recipeId);
  }
  return sets;
}

export async function computeCohortDistance(opts: ComputeOptions): Promise<CohortDistanceSnapshot> {
  const { cohortId, asOfDate, persist } = opts;

  // Pull a 90-day window of views once; bucket per user per lookback in memory.
  const ninetyDaysAgo = new Date(asOfDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  const views = (await (prisma as any).recipeView.findMany({
    where: { viewedAt: { gte: ninetyDaysAgo, lte: asOfDate } },
    select: { userId: true, recipeId: true, viewedAt: true },
  })) as RawView[];

  const allUsers = new Set(views.map((v) => v.userId));
  if (allUsers.size < MIN_SAMPLE_SIZE) {
    throw new Error(
      `computeCohortDistance: sample size ${allUsers.size} below minimum ${MIN_SAMPLE_SIZE}`
    );
  }

  const sets7 = buildUserSets(views, 7, asOfDate);
  const sets30 = buildUserSets(views, 30, asOfDate);
  const sets90 = buildUserSets(views, 90, asOfDate);

  const d7Median = sets7.size >= 2 ? median(pairwiseDistances(sets7)) : 0;
  const d30Median = sets30.size >= 2 ? median(pairwiseDistances(sets30)) : 0;
  const d90Median = sets90.size >= 2 ? median(pairwiseDistances(sets90)) : 0;

  const snapshot: CohortDistanceSnapshot = {
    cohortId,
    asOfDate,
    d7Median,
    d30Median,
    d90Median,
    sampleSize: allUsers.size,
  };

  if (persist) {
    await (prisma as any).cohortDistanceSnapshot.upsert({
      where: { cohortId_asOfDate: { cohortId, asOfDate } },
      create: snapshot,
      update: snapshot,
    });
  }

  return snapshot;
}
