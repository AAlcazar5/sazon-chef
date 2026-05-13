// backend/src/modules/today/widgetController.ts
// P2 retention — iOS / Android home-screen widget data layer.
//
// GET /api/today/widget
//
// Returns the minimal "Tonight's Plate" payload for the home-screen widget.
// Selection priority:
//   1. Dinner slot of an active meal plan covering today.
//   2. User's most-recently-viewed recipe (a proxy for "what they were
//      already thinking about").
//   3. null — the widget renders a quiet "Open Sazon" prompt in that case.
//
// The widget timeline provider refreshes every 30 minutes and tap-targets
// the recipe via the universal-link `sazon://recipe/{recipeId}` (handled
// by Expo Router on the JS side).

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';

export interface WidgetPayload {
  recipeId: string | null;
  title: string | null;
  imageUrl: string | null;
  cookTime: number | null;
  cuisine: string | null;
  /** Eyebrow text — "TONIGHT'S PLATE", "WHILE YOU PLAN", etc. */
  eyebrow: string;
  /** Optional deep-link target (Expo Router path). */
  deepLink: string | null;
}

const QUIET: WidgetPayload = {
  recipeId: null,
  title: null,
  imageUrl: null,
  cookTime: null,
  cuisine: null,
  eyebrow: "WHILE YOU PLAN",
  deepLink: null,
};

/**
 * Picks today's dinner slot from a user's active meal plan, if any.
 * Pure function exported for unit testing.
 */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function pickFromMealPlan(
  meals: ReadonlyArray<{
    mealType: string | null;
    date: Date | null;
    recipe: {
      id: string;
      title: string;
      imageUrl: string | null;
      cookTime: number | null;
      cuisine: string | null;
    } | null;
  }>,
  now: Date = new Date(),
): WidgetPayload | null {
  const todayStr = localDateKey(now);
  for (const meal of meals) {
    if (!meal.recipe) continue;
    const dateStr = meal.date ? localDateKey(meal.date) : null;
    if (dateStr !== todayStr) continue;
    if ((meal.mealType ?? '').toLowerCase() !== 'dinner') continue;
    return {
      recipeId: meal.recipe.id,
      title: meal.recipe.title,
      imageUrl: meal.recipe.imageUrl,
      cookTime: meal.recipe.cookTime,
      cuisine: meal.recipe.cuisine,
      eyebrow: "TONIGHT'S PLATE",
      deepLink: `sazon://recipe/${meal.recipe.id}`,
    };
  }
  return null;
}

export async function getWidgetPayload(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);

    // 1. Today's dinner from an active meal plan.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const meals = await prisma.meal.findMany({
      where: {
        mealPlan: { userId },
        date: { gte: today, lt: tomorrow },
        mealType: 'dinner',
      },
      select: {
        mealType: true,
        date: true,
        recipe: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            cookTime: true,
            cuisine: true,
          },
        },
      },
    });
    const fromPlan = pickFromMealPlan(meals);
    if (fromPlan) {
      res.json(fromPlan);
      return;
    }

    // 2. Most-recently-viewed recipe.
    const recentView = await prisma.recipeView.findFirst({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      select: {
        recipe: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            cookTime: true,
            cuisine: true,
          },
        },
      },
    });
    if (recentView?.recipe) {
      const r = recentView.recipe;
      res.json({
        recipeId: r.id,
        title: r.title,
        imageUrl: r.imageUrl,
        cookTime: r.cookTime,
        cuisine: r.cuisine,
        eyebrow: 'PICK UP WHERE YOU LEFT OFF',
        deepLink: `sazon://recipe/${r.id}`,
      } satisfies WidgetPayload);
      return;
    }

    res.json(QUIET);
  } catch (error) {
    logger.error({ err: error }, 'widget.getWidgetPayload.failed');
    res.json(QUIET);
  }
}
