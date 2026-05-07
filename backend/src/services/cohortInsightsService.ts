// ROADMAP 4.0 N7.3 — cohortInsightsService.
//
// Unifies HX2.3 hero cohort overlay + RD5 cookedNext into one privacy-aware
// service. Two surfaces previously planned parallel privacy plumbing for the
// same primitive (other users' CookingLog rows for cohort co-cook signal);
// this service makes the privacy gate the SINGLE source of truth.
//
// Privacy contract (gated through N8.2 userPrivacyService):
//   - getFriendCohort: returns named-friend list when caller has socialOptIn
//     AND target user's UserFollow relation is present. Otherwise returns
//     an opaque count or [].
//   - getCookedNext: aggregate cross-user data; gated on shareOptIn AND a
//     k-anonymity floor (k ≥ 30 contributing distinct users).

import { prisma } from '../lib/prisma';
import {
  canShareCrossUserData,
  canSurfaceFriends,
} from './userPrivacyService';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const COHORT_KANON_FLOOR = 30;
const FRIEND_COHORT_DEFAULT_WINDOW_DAYS = 14;
const COOKEDNEXT_DEFAULT_K = 5;

export interface FriendCohortMember {
  userId: string;
  /** First name only — never email or full name. Empty when privacy hides identity. */
  firstName: string;
  cookedAt: Date;
}

export interface FriendCohortResult {
  /** Named friends who cooked this recipe within the window. */
  members: FriendCohortMember[];
  /** Total count (always honest); >= members.length. */
  totalCount: number;
  /** True iff names were redacted because the caller's socialOptIn is off. */
  identityRedacted: boolean;
}

export interface GetFriendCohortInput {
  userId: string;
  recipeId: string;
  windowDays?: number;
}

interface CookRow {
  userId: string;
  cookedAt: Date;
  user: { name: string | null } | null;
}

function firstNameOf(name: string | null): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}

/**
 * Friends who cooked the given recipe within `windowDays`. Empty when the
 * caller has no follows OR the privacy gate is off.
 */
export async function getFriendCohort(
  input: GetFriendCohortInput,
): Promise<FriendCohortResult> {
  const empty: FriendCohortResult = {
    members: [],
    totalCount: 0,
    identityRedacted: false,
  };
  if (!input.userId || !input.recipeId) return empty;

  const windowDays = input.windowDays ?? FRIEND_COHORT_DEFAULT_WINDOW_DAYS;
  const since = new Date(Date.now() - windowDays * MS_PER_DAY);

  // 1. Resolve who the user follows.
  const follows = (await (prisma as any).userFollow.findMany({
    where: { followerId: input.userId },
    select: { followingId: true },
  })) as Array<{ followingId: string }>;
  if (follows.length === 0) return empty;

  const friendIds = follows.map((f) => f.followingId);

  // 2. Resolve cooks of this recipe within the window by those friends.
  const cooks = (await (prisma as any).cookingLog.findMany({
    where: {
      recipeId: input.recipeId,
      cookedAt: { gte: since },
      userId: { in: friendIds },
    },
    select: {
      userId: true,
      cookedAt: true,
      user: { select: { name: true } },
    },
    orderBy: { cookedAt: 'desc' },
  })) as CookRow[];
  if (cooks.length === 0) return empty;

  // 3. Privacy gate — when the *caller* has socialOptIn off, redact names.
  const namesAllowed = await canSurfaceFriends(input.userId);

  // Dedup by userId (a friend may have cooked twice in the window).
  const seen = new Set<string>();
  const members: FriendCohortMember[] = [];
  for (const c of cooks) {
    if (seen.has(c.userId)) continue;
    seen.add(c.userId);
    members.push({
      userId: c.userId,
      firstName: namesAllowed ? firstNameOf(c.user?.name ?? null) : '',
      cookedAt: c.cookedAt,
    });
  }

  return {
    members,
    totalCount: members.length,
    identityRedacted: !namesAllowed,
  };
}

export interface CookedNextRecipe {
  recipeId: string;
  /** Number of distinct users who cooked this after the anchor. */
  cookCount: number;
}

export interface CookedNextResult {
  recipes: CookedNextRecipe[];
  /** True iff the caller's shareOptIn is off (and the result is therefore []). */
  privacyOptOut: boolean;
  /** True iff the result was redacted by the k-anonymity floor (cooker count below threshold). */
  belowKAnonFloor: boolean;
}

export interface GetCookedNextInput {
  /** Anchor recipe — find the recipes other users cooked after this one. */
  recipeId: string;
  /** Top-K. Default 5. */
  k?: number;
  /** Caller's user id — excluded from the cohort. */
  excludeUserId?: string;
  /** Lookback window for "next" cooks. Default 30 days. */
  withinDays?: number;
}

const COOKEDNEXT_DEFAULT_WINDOW_DAYS = 30;

interface AnchorCookRow {
  userId: string;
  cookedAt: Date;
}

interface FollowupCookRow {
  recipeId: string;
  userId: string;
}

/**
 * "People who cooked X also cooked Y." Aggregate cross-user data; gated on
 * the *anchor* recipe's distinct-cooker count clearing the k-anonymity floor.
 */
export async function getCookedNext(
  input: GetCookedNextInput,
): Promise<CookedNextResult> {
  const empty: CookedNextResult = {
    recipes: [],
    privacyOptOut: false,
    belowKAnonFloor: false,
  };
  if (!input.recipeId) return empty;

  // Privacy gate is on the CALLER's privacy setting (their reading the
  // aggregated data is what we gate). When opted-out, return [].
  if (input.excludeUserId) {
    const allowed = await canShareCrossUserData(input.excludeUserId);
    if (!allowed) {
      return { ...empty, privacyOptOut: true };
    }
  }

  const k = input.k ?? COOKEDNEXT_DEFAULT_K;
  const windowDays = input.withinDays ?? COOKEDNEXT_DEFAULT_WINDOW_DAYS;
  const since = new Date(Date.now() - windowDays * MS_PER_DAY);

  // 1. Find anchor cooks within the window (excluding the caller).
  const anchorWhere: Record<string, unknown> = {
    recipeId: input.recipeId,
    cookedAt: { gte: since },
  };
  if (input.excludeUserId) {
    anchorWhere.userId = { not: input.excludeUserId };
  }
  const anchorCooks = (await (prisma as any).cookingLog.findMany({
    where: anchorWhere,
    select: { userId: true, cookedAt: true },
  })) as AnchorCookRow[];

  const distinctCookers = new Set(anchorCooks.map((c) => c.userId));
  if (distinctCookers.size < COHORT_KANON_FLOOR) {
    return { ...empty, belowKAnonFloor: true };
  }

  // 2. For each anchor cooker, find the recipe they cooked NEXT after the
  //    anchor (within the window). Aggregate by recipeId.
  const followupCounts = new Map<string, Set<string>>();
  for (const anchor of anchorCooks) {
    // eslint-disable-next-line no-await-in-loop
    const next = (await (prisma as any).cookingLog.findFirst({
      where: {
        userId: anchor.userId,
        cookedAt: { gt: anchor.cookedAt },
        recipeId: { not: input.recipeId },
      },
      orderBy: { cookedAt: 'asc' },
      select: { recipeId: true, userId: true },
    })) as FollowupCookRow | null;
    if (!next) continue;
    if (!followupCounts.has(next.recipeId)) {
      followupCounts.set(next.recipeId, new Set());
    }
    followupCounts.get(next.recipeId)!.add(next.userId);
  }

  const recipes: CookedNextRecipe[] = [];
  for (const [recipeId, users] of followupCounts) {
    recipes.push({ recipeId, cookCount: users.size });
  }
  recipes.sort((a, b) => b.cookCount - a.cookCount);
  return {
    recipes: recipes.slice(0, k),
    privacyOptOut: false,
    belowKAnonFloor: false,
  };
}

export const __INTERNALS = {
  COHORT_KANON_FLOOR,
  FRIEND_COHORT_DEFAULT_WINDOW_DAYS,
  COOKEDNEXT_DEFAULT_K,
  COOKEDNEXT_DEFAULT_WINDOW_DAYS,
};
