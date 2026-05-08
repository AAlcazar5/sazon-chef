// backend/src/modules/recap/yearlyRecapController.ts
// ROADMAP 4.0 J13 — Sazon Wrapped HTTP layer.
//
// Mirrors weeklyRecapController. Reads the user's cooks + ingredients +
// nutrient totals + cuisine first-cook history for the requested year and
// hands them to buildYearlyWrapped. The frontend gates the *display* by
// calendar window + year-seen flag — this endpoint just builds the payload
// whenever asked, so internal dogfood + QA can preview Wrapped any time.
import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { buildYearlyWrapped } from '@/services/yearlyRecapService';
import { logger } from '@/utils/logger';

interface CookRow {
  recipeId: string;
  cookedAt: Date;
  recipe: { cuisine: string | null; ingredients: Array<{ text: string }> } | null;
}

interface FirstCookRow {
  cookedAt: Date;
  recipe: { cuisine: string | null } | null;
}

function parseYear(raw: unknown): number {
  const fallback = new Date().getUTCFullYear();
  if (typeof raw !== 'string' || !raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 2000 || n > 2100) return fallback;
  return n;
}

function startOfYear(year: number): Date {
  return new Date(Date.UTC(year, 0, 1));
}

function endOfYear(year: number): Date {
  return new Date(Date.UTC(year + 1, 0, 1));
}

export const yearlyRecapController = {
  async get(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const year = parseYear(req.query.year);
      const yearStart = startOfYear(year);
      const yearEnd = endOfYear(year);

      const yearCooks = (await (prisma as any).cookingLog.findMany({
        where: { userId, cookedAt: { gte: yearStart, lt: yearEnd } },
        select: {
          recipeId: true,
          cookedAt: true,
          recipe: {
            select: { cuisine: true, ingredients: { select: { text: true } } },
          },
        },
        orderBy: { cookedAt: 'asc' },
      })) as CookRow[];

      const cooks = yearCooks.map((c) => ({
        recipeId: c.recipeId,
        cuisine: c.recipe?.cuisine ?? null,
        cookedAt: c.cookedAt,
      }));

      const ingredientCounts = new Map<string, number>();
      for (const c of yearCooks) {
        for (const ing of c.recipe?.ingredients ?? []) {
          const name = ing.text.toLowerCase();
          ingredientCounts.set(name, (ingredientCounts.get(name) ?? 0) + 1);
        }
      }
      const ingredients = [...ingredientCounts.entries()].map(([name, count]) => ({
        name,
        count,
      }));

      // First-cook timestamp per cuisine across the user's full history.
      // Used by computeFirstTimeCuisine to surface "first time this year".
      const allUserCooks = (await (prisma as any).cookingLog.findMany({
        where: { userId },
        select: { cookedAt: true, recipe: { select: { cuisine: true } } },
        orderBy: { cookedAt: 'asc' },
      })) as FirstCookRow[];
      const firstCookByCuisine = new Map<string, Date>();
      for (const c of allUserCooks) {
        const cui = c.recipe?.cuisine;
        if (!cui) continue;
        if (!firstCookByCuisine.has(cui)) firstCookByCuisine.set(cui, c.cookedAt);
      }
      const cuisinesEverTried = [...firstCookByCuisine.entries()].map(
        ([cuisine, firstCookedAt]) => ({ cuisine, firstCookedAt })
      );

      // Nutrient aggregation depends on D13 (not yet shipped). Service
      // handles {} gracefully — micros slide falls through to the
      // discovery-not-verdict copy.
      const payload = buildYearlyWrapped({
        userId,
        year,
        cooks,
        ingredients,
        nutrientTotals: {},
        nutrientTargets: {},
        cuisinesEverTried,
      });
      return res.json(payload);
    } catch (err) {
      logger.error({ err }, 'yearlyRecapController.get failed');
      return res.status(500).json({ error: 'Failed to build yearly recap' });
    }
  },
};
