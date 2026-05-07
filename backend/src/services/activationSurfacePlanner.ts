// ROADMAP 4.0 N12.1 + N12.2 — Activation cliff surface planner.
//
// A user signed up on Monday but hasn't cooked by Thursday is in the
// "activation cliff": every adapted feature in the app is stuck in
// cold-start because the engines have no signal. The planner surfaces a
// single editorial card on Today designed to drive a first cook within
// 7 days.
//
// Day 0–2: no surface (user is still settling in).
// Day 3–6 (0 cooks):  3-recipe starter strip, tuned to onboarding-stated
//                     cuisines. Hides as soon as cookCount > 0.
// Day 7+ (0 cooks):   softer "no rush" surface; ranker enters lighter
//                     cold-start mode using onboarding signals only.
//
// Cross-tier dovetail (N6 reveal): the day-3 surface registers a
// capability so its first appearance fires the reveal animation.

import { prisma } from '../lib/prisma';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAY_3_FLOOR = 3;
const DAY_7_FLOOR = 7;
const STARTER_RECIPE_COUNT = 3;
const STARTER_COOK_TIME_MAX = 30;

export type ActivationPhase = 'day-3' | 'day-7';

export interface ActivationStarterRecipe {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
}

export interface ActivationSurface {
  phase: ActivationPhase;
  /** Days since the user signed up (floor). */
  daysSinceSignup: number;
  /** 3 starter recipes for `day-3`; empty for `day-7`. */
  recipes: ActivationStarterRecipe[];
  /** Cuisines pulled from the user's onboarding answers. */
  onboardingCuisines: string[];
  /** Lifestyle-voice copy. */
  headline: string;
  body: string;
}

export interface PickActivationSurfaceInput {
  userId: string;
  /** Reference time for the day-count math. Defaults to `new Date()`. */
  now?: Date;
}

interface UserSignupSnapshot {
  createdAt: Date;
  preferences: {
    likedCuisines: Array<{ name: string }>;
    seededCuisines: string | null;
  } | null;
}

interface RecipeMatch {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
}

function parseSeededCuisines(seededJson: string | null): string[] {
  if (!seededJson) return [];
  try {
    const arr = JSON.parse(seededJson);
    if (Array.isArray(arr)) {
      return arr.filter((s): s is string => typeof s === 'string' && s.length > 0);
    }
  } catch {
    // malformed — fall back to empty
  }
  return [];
}

function dedupCuisines(...sources: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const source of sources) {
    for (const c of source) {
      const key = c.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(c.trim());
    }
  }
  return out;
}

async function loadUserSnapshot(
  userId: string,
): Promise<UserSignupSnapshot | null> {
  return (await (prisma as any).user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      preferences: {
        select: {
          likedCuisines: { select: { name: true } },
          seededCuisines: true,
        },
      },
    },
  })) as UserSignupSnapshot | null;
}

async function loadStarterRecipes(
  cuisines: string[],
): Promise<ActivationStarterRecipe[]> {
  if (cuisines.length === 0) {
    // Cold-cold fallback: any beginner-friendly recipe under cookTime cap
    return loadRecipesByCuisine([], STARTER_RECIPE_COUNT);
  }
  return loadRecipesByCuisine(cuisines, STARTER_RECIPE_COUNT);
}

async function loadRecipesByCuisine(
  cuisines: string[],
  k: number,
): Promise<ActivationStarterRecipe[]> {
  const where: Record<string, unknown> = {
    cookTime: { lte: STARTER_COOK_TIME_MAX, not: null },
  };
  if (cuisines.length > 0) where.cuisine = { in: cuisines };
  const rows = (await (prisma as any).recipe.findMany({
    where,
    select: {
      id: true,
      title: true,
      cuisine: true,
      cookTime: true,
      imageUrl: true,
    },
    orderBy: { cookTime: 'asc' },
    take: k,
  })) as RecipeMatch[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    cuisine: r.cuisine,
    cookTime: r.cookTime,
    imageUrl: r.imageUrl,
  }));
}

/**
 * Returns the activation surface payload, or null when the user is outside
 * the window (settled in for < 3 days, OR has cooked at least once).
 */
export async function pickActivationSurface(
  input: PickActivationSurfaceInput,
): Promise<ActivationSurface | null> {
  if (!input.userId) return null;
  const now = input.now ?? new Date();

  const snapshot = await loadUserSnapshot(input.userId);
  if (!snapshot) return null;

  const daysSinceSignup = Math.floor(
    (now.getTime() - snapshot.createdAt.getTime()) / MS_PER_DAY,
  );
  if (daysSinceSignup < DAY_3_FLOOR) return null;

  // Hides as soon as the user has cooked at least once.
  const cookCount = (await (prisma as any).cookingLog.count({
    where: { userId: input.userId },
  })) as number;
  if (cookCount > 0) return null;

  const onboardingCuisines = dedupCuisines(
    (snapshot.preferences?.likedCuisines ?? []).map((r) => r.name),
    parseSeededCuisines(snapshot.preferences?.seededCuisines ?? null),
  );

  if (daysSinceSignup >= DAY_7_FLOOR) {
    // Day-7+ — softer surface. No recipe trio (the user already saw it on
    // day 3 and didn't bite); ranker enters lighter cold-start mode at the
    // call site (caller passes coldStartMode: 'sustained').
    return {
      phase: 'day-7',
      daysSinceSignup,
      recipes: [],
      onboardingCuisines,
      headline: 'No rush — Sazon is happy to suggest whenever you\'re ready.',
      body: 'Tap any recipe to start. The kitchen learns from the first one.',
    };
  }

  // Day 3–6 with 0 cooks
  const recipes = await loadStarterRecipes(onboardingCuisines);
  const cuisineHint =
    onboardingCuisines.length > 0
      ? ` from cuisines you mentioned`
      : '';
  return {
    phase: 'day-3',
    daysSinceSignup,
    recipes,
    onboardingCuisines,
    headline: 'Ready for the first cook?',
    body: `Three 30-minute starters${cuisineHint} — pick one and Sazon learns from there.`,
  };
}

export const __INTERNALS = {
  DAY_3_FLOOR,
  DAY_7_FLOOR,
  STARTER_RECIPE_COUNT,
  STARTER_COOK_TIME_MAX,
};
