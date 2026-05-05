// backend/src/modules/dailyCheckIn/dailyCheckInController.ts
// ROADMAP 4.0 Tier C7 — Daily check-in HTTP layer.

import { Request, Response } from 'express';
import { z } from 'zod';
import { getUserId } from '@/utils/authHelper';
import {
  upsertDailyCheckIn,
  getRecentCheckIns,
  computeAdaptationSignal,
} from '@/services/dailyCheckInService';
import { logger } from '@/utils/logger';

const upsertSchema = z.object({
  date: z.string(),
  nutritionSnapshot: z.unknown().optional(),
  reflectionText: z.string().max(500).optional(),
  hungerNow: z.number().int().min(1).max(5).optional(),
  energyAtLastMeal: z.number().int().min(1).max(5).optional(),
  satietyFromYesterday: z.number().int().min(1).max(5).optional(),
});

export const dailyCheckInController = {
  async upsert(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const parsed = upsertSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid check-in payload', details: parsed.error.format() });
      }
      const date = new Date(parsed.data.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Invalid date' });
      }
      await upsertDailyCheckIn({
        userId,
        date,
        nutritionSnapshot: parsed.data.nutritionSnapshot,
        reflectionText: parsed.data.reflectionText,
        hungerNow: parsed.data.hungerNow,
        energyAtLastMeal: parsed.data.energyAtLastMeal,
        satietyFromYesterday: parsed.data.satietyFromYesterday,
      });
      return res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, 'dailyCheckInController.upsert failed');
      return res.status(500).json({ error: 'Failed to save check-in' });
    }
  },

  async list(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const limitParam = req.query.limit;
      const limit = typeof limitParam === 'string' ? Math.min(parseInt(limitParam, 10) || 7, 30) : 7;
      const checkIns = await getRecentCheckIns(userId, limit);
      const signals = computeAdaptationSignal(
        checkIns.map((c) => ({
          date: c.date,
          hungerNow: c.hungerNow,
          energyAtLastMeal: c.energyAtLastMeal,
          satietyFromYesterday: c.satietyFromYesterday,
        }))
      );
      return res.json({ checkIns, signals });
    } catch (err) {
      logger.error({ err }, 'dailyCheckInController.list failed');
      return res.status(500).json({ error: 'Failed to load check-ins' });
    }
  },
};
