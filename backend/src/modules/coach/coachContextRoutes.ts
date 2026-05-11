// Group 10Y Phase 3: lightweight Coach context endpoint feeding the 4 N=1
// quick-start chips on the chat shell.

import { Router, Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { getAdjacentCuisines } from '@/utils/cuisineAdjacency';
import { userActionLimiter } from '@/middleware/rateLimiter';

const EXPIRING_DAYS = 3;

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export const coachContextRoutes = Router();
coachContextRoutes.use(userActionLimiter);

coachContextRoutes.get('/context', async (req: Request, res: Response) => {
  const userId = getUserId(req);

  const expiringCutoff = new Date(
    Date.now() + EXPIRING_DAYS * 24 * 60 * 60 * 1000,
  );

  const [leftovers, macroGoals, todayMeals, prefs] = await Promise.all([
    prisma.leftoverInventory.findMany({
      where: { userId, expiresAt: { lte: expiringCutoff } },
      orderBy: { expiresAt: 'asc' },
      include: { component: { select: { name: true } } } as any,
    }) as any,
    prisma.macroGoals.findUnique({ where: { userId } }),
    prisma.meal.findMany({
      where: { date: { gte: startOfTodayUTC() }, mealPlan: { userId } },
    }),
    prisma.userPreferences.findUnique({
      where: { userId },
      include: { likedCuisines: true },
    }),
  ]);

  const consumed = todayMeals.reduce(
    (acc, m) => ({
      calories:
        acc.calories +
        Number(
          (m as { calories?: number; customCalories?: number }).calories ??
            (m as { customCalories?: number }).customCalories ??
            0,
        ),
      protein:
        acc.protein +
        Number(
          (m as { protein?: number; customProtein?: number }).protein ??
            (m as { customProtein?: number }).customProtein ??
            0,
        ),
      carbs:
        acc.carbs +
        Number(
          (m as { carbs?: number; customCarbs?: number }).carbs ??
            (m as { customCarbs?: number }).customCarbs ??
            0,
        ),
      fat:
        acc.fat +
        Number(
          (m as { fat?: number; customFat?: number }).fat ??
            (m as { customFat?: number }).customFat ??
            0,
        ),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const remainingMacros = macroGoals
    ? {
        calories: macroGoals.calories - consumed.calories,
        protein: macroGoals.protein - consumed.protein,
        carbs: macroGoals.carbs - consumed.carbs,
        fat: macroGoals.fat - consumed.fat,
      }
    : null;

  // Top adjacent cuisine = first adjacency for the most-liked cuisine.
  let topAdjacentCuisine: string | null = null;
  const liked = prefs?.likedCuisines.map((c) => c.name) ?? [];
  if (liked.length > 0) {
    const adj = getAdjacentCuisines(liked[0]);
    if (adj.length > 0) topAdjacentCuisine = adj[0].cuisine;
  }

  type LeftoverWithName = {
    id: string;
    componentId: string;
    slot: string;
    portionsRemaining: number;
    expiresAt: Date;
    component?: { name: string } | null;
  };
  const typed = leftovers as LeftoverWithName[];

  res.status(200).json({
    pantryExpiringSoon: typed
      .map((l) => l.component?.name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0),
    leftoverInventory: typed.map((l) => ({
      id: l.id,
      componentId: l.componentId,
      slot: l.slot,
      portionsRemaining: l.portionsRemaining,
      expiresAt: l.expiresAt.toISOString(),
      name: l.component?.name ?? null,
    })),
    remainingMacros,
    topAdjacentCuisine,
  });
});
