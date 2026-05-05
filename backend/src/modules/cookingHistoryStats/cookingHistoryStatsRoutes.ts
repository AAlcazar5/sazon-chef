// backend/src/modules/cookingHistoryStats/cookingHistoryStatsRoutes.ts
// ROADMAP 4.0 Tier J11 — Cooking history stats routes.

import { Router } from 'express';
import { cookingHistoryStatsController } from './cookingHistoryStatsController';

export const cookingHistoryStatsRoutes = Router();
cookingHistoryStatsRoutes.get('/most-recent', cookingHistoryStatsController.mostRecent);
