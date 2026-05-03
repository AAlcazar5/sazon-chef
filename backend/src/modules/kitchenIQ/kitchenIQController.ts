// Group 10S: Kitchen IQ progress endpoint.

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { computeCookingStats } from '../user/cookingStatsService';
import { computeProgress, type ProgressInput } from './kitchenIQProgressService';

function parseLastCheckedUnlocks(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

export const kitchenIQController = {
  async getProgress(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const [logs, preferences, ingredientRows] = await Promise.all([
        prisma.cookingLog.findMany({
          where: { userId },
          select: {
            cookedAt: true,
            recipe: { select: { cuisine: true, difficulty: true } },
          },
          orderBy: { cookedAt: 'desc' },
        }),
        prisma.userPreferences.findUnique({
          where: { userId },
          select: { lastCheckedUnlocks: true },
        }),
        prisma.recipeIngredient.findMany({
          where: { recipe: { cookingLogs: { some: { userId } } } },
          select: { text: true },
          take: 2000,
        }),
      ]);

      const stats = computeCookingStats(logs, new Date(), []);
      const ingredientsCooked = ingredientRows.map((r) => r.text);
      const lastCheckedUnlocks = parseLastCheckedUnlocks(preferences?.lastCheckedUnlocks);

      const input: ProgressInput = {
        recipesCookedAllTime: stats.recipesCookedAllTime,
        cuisinesExploredCount: stats.cuisinesExplored.length,
        ingredientsCooked,
        lastCheckedUnlocks,
      };

      const progress = computeProgress(input);

      // Persist the new full unlocked set so subsequent reads correctly diff.
      await prisma.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          cookTimePreference: 30,
          lastCheckedUnlocks: JSON.stringify(progress.unlockedIds),
        },
        update: {
          lastCheckedUnlocks: JSON.stringify(progress.unlockedIds),
        },
      });

      return res.json(progress);
    } catch (error) {
      console.error('Get kitchen IQ progress error:', error);
      return res.status(500).json({ error: 'Failed to fetch kitchen IQ progress' });
    }
  },
};
