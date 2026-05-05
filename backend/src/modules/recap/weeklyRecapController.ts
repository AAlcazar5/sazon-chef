// backend/src/modules/recap/weeklyRecapController.ts
// ROADMAP 4.0 Tier C9 — Weekly recap HTTP layer.

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { buildWeeklyRecap } from '@/services/weeklyRecapService';
import { logger } from '@/utils/logger';

/** Returns the start (Monday 00:00) of the week containing `d`, in UTC. */
function startOfWeek(d: Date): Date {
  const day = d.getUTCDay() || 7; // Sun=0 → 7 so Monday=1
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (day - 1));
  return start;
}

function endOfWeek(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 7);
  return end;
}

interface CookRow {
  recipeId: string;
  cookedAt: Date;
  recipe: { cuisine: string | null; ingredients: Array<{ name: string }> } | null;
}

export const weeklyRecapController = {
  async get(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(weekStart);

      // Cooks for the current week.
      const thisWeekCooks = (await (prisma as any).cookingLog.findMany({
        where: { userId, cookedAt: { gte: weekStart, lt: weekEnd } },
        select: {
          recipeId: true,
          cookedAt: true,
          recipe: { select: { cuisine: true, ingredients: { select: { name: true } } } },
        },
      })) as CookRow[];

      const cooks = thisWeekCooks.map((c) => ({
        recipeId: c.recipeId,
        cuisine: c.recipe?.cuisine ?? null,
        cookedAt: c.cookedAt,
      }));

      // Ingredient counts across the week's cooked recipes.
      const ingredientCounts = new Map<string, number>();
      for (const c of thisWeekCooks) {
        for (const ing of c.recipe?.ingredients ?? []) {
          const name = ing.name.toLowerCase();
          ingredientCounts.set(name, (ingredientCounts.get(name) ?? 0) + 1);
        }
      }
      const ingredients = [...ingredientCounts.entries()].map(([name, count]) => ({ name, count }));

      // "New this week" = cuisine cooked for the first time this week
      // (zero prior CookingLogs for that cuisine before weekStart).
      const cuisinesThisWeek = new Set<string>();
      for (const c of cooks) {
        if (c.cuisine) cuisinesThisWeek.add(c.cuisine);
      }
      const newCuisinesThisWeek: string[] = [];
      for (const cuisine of cuisinesThisWeek) {
        const priorCount = (await (prisma as any).cookingLog.count({
          where: {
            userId,
            cookedAt: { lt: weekStart },
            recipe: { cuisine },
          },
        })) as number;
        if (priorCount === 0) {
          newCuisinesThisWeek.push(cuisine);
        }
      }

      // Nutrient totals + targets are stubs until D13 (nutrient aggregation)
      // ships. Service handles {} gracefully.
      const card = buildWeeklyRecap({
        userId,
        weekStart,
        weekEnd,
        cooks,
        ingredients,
        nutrientTotals: {},
        nutrientTargets: {},
        newCuisinesThisWeek,
        newIngredientsThisWeek: [],
      });

      return res.json(card);
    } catch (err) {
      logger.error({ err }, 'weeklyRecapController.get failed');
      return res.status(500).json({ error: 'Failed to build weekly recap' });
    }
  },
};
