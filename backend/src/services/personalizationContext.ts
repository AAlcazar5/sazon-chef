// ROADMAP 4.0 N0.2 — Single personalizationContext builder.
//
// All surfaces today rebuild the user's signal context independently —
// pantry, recent cooks, nutrient gap, cuisine lean, friend cohort. This
// service collapses those reads into a single `buildPersonalizationContext`
// call cached for the request, ensuring every surface sees the same signal
// snapshot.
//
// Cross-tier dovetail (N0.1): sazonBrain calls this builder once per
// `recommend` request and passes the snapshot to every dispatched ranker.
// Surfaces that consume the snapshot directly (HX0.2 hero rationale,
// IG10 pantry IQ, FX3.4 chip ordering) read from the same shape.

import { prisma } from '../lib/prisma';
import { getExpiring, type ExpiringItem } from './expiringInventoryService';

const COOK_LOOKBACK_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Tier mapping per N2.1 canonical thresholds (cook-based). */
export type SignalCoverage = 'cold' | 'mid' | 'high';

export interface CuisineLean {
  cuisine: string;
  cookCount: number;
}

export interface PersonalizationContext {
  userId: string;
  /** Total CookingLog count in the lookback window. */
  recentCookCount: number;
  /** Total CookingLog count over the user's entire history. */
  lifetimeCookCount: number;
  /** Days since signup (User.createdAt). */
  daysSinceSignup: number;
  /** Aggregate signal-coverage tier (cook-based per N2.1). */
  signalCoverage: SignalCoverage;
  /** Pantry item names (case preserved as stored). */
  pantry: string[];
  /** Items expiring within 3 days, ordered most-urgent first. */
  expiringItems: ExpiringItem[];
  /** Top cuisines by recent cook count, descending. */
  cuisineLean: CuisineLean[];
  /** UserPreferences fields the rankers / voice service need. */
  preferences: {
    cookingSkillLevel: string | null;
    goalPhase: string | null;
    nutritionUIDensity: string | null;
    cookTimePreference: number | null;
  };
  /** Reference time used for the snapshot. Tests inject; default `new Date()`. */
  asOf: Date;
}

export interface BuildPersonalizationContextInput {
  userId: string;
  /** Inject reference time for tests. */
  now?: Date;
}

/**
 * Convert a recent-cook count to the canonical signal-coverage tier.
 * Per N2.1: cold = 0–2, mid = 3–6, high = 7+ (cook-based).
 */
export function signalCoverageForCookCount(count: number): SignalCoverage {
  if (count <= 2) return 'cold';
  if (count <= 6) return 'mid';
  return 'high';
}

const requestCache = new Map<string, PersonalizationContext>();

function cacheKey(userId: string, asOf: Date): string {
  // Per-user-per-request bucket. Tests reset via `clearPersonalizationContextCache`.
  return `${userId}|${asOf.getTime()}`;
}

/** Test helper — clear the per-request cache. */
export function clearPersonalizationContextCache(): void {
  requestCache.clear();
}

async function loadRecentCooks(
  userId: string,
  since: Date,
): Promise<Array<{ cookedAt: Date; recipe: { cuisine: string | null } | null }>> {
  return (await (prisma as any).cookingLog.findMany({
    where: { userId, cookedAt: { gte: since } },
    include: { recipe: { select: { cuisine: true } } },
  })) as Array<{ cookedAt: Date; recipe: { cuisine: string | null } | null }>;
}

function rankCuisines(
  cooks: Array<{ recipe: { cuisine: string | null } | null }>,
): CuisineLean[] {
  const counts = new Map<string, number>();
  for (const cook of cooks) {
    const cuisine = cook.recipe?.cuisine?.trim();
    if (!cuisine) continue;
    counts.set(cuisine, (counts.get(cuisine) ?? 0) + 1);
  }
  const out: CuisineLean[] = [];
  for (const [cuisine, cookCount] of counts) {
    out.push({ cuisine, cookCount });
  }
  out.sort((a, b) => b.cookCount - a.cookCount || a.cuisine.localeCompare(b.cuisine));
  return out;
}

/**
 * Build the unified per-user signal snapshot. Cached per (userId, asOf)
 * so multiple surfaces in the same request reuse the same snapshot.
 *
 * Returns a graceful empty-but-valid context for unknown users (cookCount=0,
 * pantry=[], etc) so callers can pass through to cold-start logic.
 */
export async function buildPersonalizationContext(
  input: BuildPersonalizationContextInput,
): Promise<PersonalizationContext> {
  const asOf = input.now ?? new Date();
  if (!input.userId) {
    return {
      userId: '',
      recentCookCount: 0,
      lifetimeCookCount: 0,
      daysSinceSignup: 0,
      signalCoverage: 'cold',
      pantry: [],
      expiringItems: [],
      cuisineLean: [],
      preferences: {
        cookingSkillLevel: null,
        goalPhase: null,
        nutritionUIDensity: null,
        cookTimePreference: null,
      },
      asOf,
    };
  }

  const key = cacheKey(input.userId, asOf);
  const hit = requestCache.get(key);
  if (hit) return hit;

  const since = new Date(asOf.getTime() - COOK_LOOKBACK_DAYS * MS_PER_DAY);

  const [user, pantryRows, recentCooks, lifetimeCount, expiring] =
    await Promise.all([
      (prisma as any).user.findUnique({
        where: { id: input.userId },
        select: {
          createdAt: true,
          preferences: {
            select: {
              cookingSkillLevel: true,
              goalPhase: true,
              cookTimePreference: true,
            },
          },
        },
      }) as Promise<{
        createdAt: Date;
        preferences: {
          cookingSkillLevel: string | null;
          goalPhase: string | null;
          cookTimePreference: number | null;
        } | null;
      } | null>,
      (prisma as any).pantryItem.findMany({
        where: { userId: input.userId },
        select: { name: true },
      }) as Promise<Array<{ name: string }>>,
      loadRecentCooks(input.userId, since),
      (prisma as any).cookingLog.count({
        where: { userId: input.userId },
      }) as Promise<number>,
      getExpiring({ userId: input.userId, withinDays: 3, now: asOf }),
    ]);

  const recentCookCount = recentCooks.length;
  const daysSinceSignup = user
    ? Math.max(
        0,
        Math.floor((asOf.getTime() - user.createdAt.getTime()) / MS_PER_DAY),
      )
    : 0;
  const cuisineLean = rankCuisines(recentCooks);

  const ctx: PersonalizationContext = {
    userId: input.userId,
    recentCookCount,
    lifetimeCookCount: lifetimeCount,
    daysSinceSignup,
    signalCoverage: signalCoverageForCookCount(recentCookCount),
    pantry: pantryRows.map((p) => p.name),
    expiringItems: expiring,
    cuisineLean,
    preferences: {
      cookingSkillLevel: user?.preferences?.cookingSkillLevel ?? null,
      goalPhase: user?.preferences?.goalPhase ?? null,
      // nutritionUIDensity isn't in current UserPreferences model — read once it lands.
      nutritionUIDensity: null,
      cookTimePreference: user?.preferences?.cookTimePreference ?? null,
    },
    asOf,
  };
  requestCache.set(key, ctx);
  return ctx;
}
