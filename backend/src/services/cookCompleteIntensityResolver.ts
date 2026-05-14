// backend/src/services/cookCompleteIntensityResolver.ts
// ROADMAP 4.0 Tier J14 — Variable-reward cook-complete tier resolver.
//
// Returns one of three intensity tiers for the cook-complete celebration:
//   - 'big'    → first-cook-of-cuisine OR first-cook of a saved recipe.
//                Earns a full Lottie chef-kiss + Sazon line + share prompt.
//   - 'medium' → rating ≥ 4 with no novelty signal.
//                Earns a sparkle + mascot wink.
//   - 'quiet'  → repeat cooks within the same week, low-rating cooks,
//                or any safe-default fall-through.
//                Earns a subtle haptic + checkmark only.
//
// Persona-aligned: not every cook is a peak, and that's what makes the peaks
// matter. Anti-streak-guilt by design — see .claude/context/guards/peak-moments.md.

import { prisma } from '../lib/prisma';
import { isFirstCookOfCuisine } from './culturalPrimerService';

export type CookCompleteIntensity = 'big' | 'medium' | 'quiet';

export interface CookIntensityInput {
  userId: string;
  cuisine?: string;
  /** Recipe id of the cooked dish — required for the saved-recipe-first-cook check. */
  recipeId?: string;
  /** Optional 1–5 star rating from the user. */
  rating?: number;
  /** Caller's clock; defaults to now. */
  asOfDate?: Date;
}

const MEDIUM_RATING_THRESHOLD = 4;

export async function resolveCookCompleteIntensity(
  input: CookIntensityInput,
): Promise<CookCompleteIntensity> {
  if (!input.userId) return 'quiet';

  const cuisine = (input.cuisine ?? '').trim();
  const asOfDate = input.asOfDate ?? new Date();
  const rating = input.rating ?? 0;

  // No cuisine signal — fall back to rating-only branch.
  if (!cuisine) {
    return rating >= MEDIUM_RATING_THRESHOLD ? 'medium' : 'quiet';
  }

  // ── Big tier ────────────────────────────────────────────────────────────
  // First-cook-of-cuisine wins immediately.
  const isFirstCuisine = await isFirstCookOfCuisine({
    userId: input.userId,
    cuisine,
    asOfDate,
  });
  if (isFirstCuisine) return 'big';

  // First-cook of a saved recipe also earns 'big'.
  if (input.recipeId) {
    const isFirstSavedCook = await isFirstCookOfSavedRecipe({
      userId: input.userId,
      recipeId: input.recipeId,
      asOfDate,
    });
    if (isFirstSavedCook) return 'big';
  }

  // ── Medium tier ─────────────────────────────────────────────────────────
  // High-rating cooks earn a sparkle even on a repeat. Rating beats same-week
  // because a deliberate 4★+ on a familiar dish is still a celebrated moment.
  if (rating >= MEDIUM_RATING_THRESHOLD) return 'medium';

  // ── Quiet tier ──────────────────────────────────────────────────────────
  // Repeat cooks within the same ISO week stay quiet (anti-rote framing).
  const cookedThisCuisineThisWeek = await hasCookedCuisineThisWeek({
    userId: input.userId,
    cuisine,
    asOfDate,
  });
  if (cookedThisCuisineThisWeek) return 'quiet';

  // Default — quiet.
  return 'quiet';
}

interface FirstSavedCookInput {
  userId: string;
  recipeId: string;
  asOfDate: Date;
}

async function isFirstCookOfSavedRecipe({
  userId,
  recipeId,
  asOfDate,
}: FirstSavedCookInput): Promise<boolean> {
  // Must be in user's saved collection AND have zero prior cooks.
  const [savedCount, priorCookCount] = await Promise.all([
    (prisma as unknown as {
      savedRecipe: { count: (args: unknown) => Promise<number> };
    }).savedRecipe.count({ where: { userId, recipeId } }),
    (prisma as unknown as {
      cookingLog: { count: (args: unknown) => Promise<number> };
    }).cookingLog.count({
      where: { userId, recipeId, cookedAt: { lt: asOfDate } },
    }),
  ]);
  return savedCount > 0 && priorCookCount === 0;
}

interface SameWeekCuisineInput {
  userId: string;
  cuisine: string;
  asOfDate: Date;
}

async function hasCookedCuisineThisWeek({
  userId,
  cuisine,
  asOfDate,
}: SameWeekCuisineInput): Promise<boolean> {
  const weekStart = isoWeekStart(asOfDate);
  const target = cuisine.toLowerCase();

  const rows = (await (prisma as unknown as {
    cookingLog: {
      findMany: (args: unknown) => Promise<
        Array<{ recipe: { cuisine: string | null } | null; cookedAt: Date }>
      >;
    };
  }).cookingLog.findMany({
    where: {
      userId,
      cookedAt: { gte: weekStart, lt: asOfDate },
    },
    select: {
      recipe: { select: { cuisine: true } },
      cookedAt: true,
    },
  })) as Array<{ recipe: { cuisine: string | null } | null; cookedAt: Date }>;

  for (const row of rows) {
    const c = row?.recipe?.cuisine?.trim().toLowerCase();
    if (c === target) return true;
  }
  return false;
}

/** ISO-week Monday 00:00 UTC for the given instant. */
function isoWeekStart(d: Date): Date {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay(); // 0..6, 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift Sunday → previous Monday
  utc.setUTCDate(utc.getUTCDate() + diff);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}
