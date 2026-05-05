// backend/src/modules/firstCookStats/firstCookStatsRoutes.ts
// ROADMAP 4.0 Tier J2 — First-cook stats routes.

import { Router } from 'express';
import { firstCookStatsController } from './firstCookStatsController';

export const firstCookStatsRoutes = Router();
firstCookStatsRoutes.get('/', firstCookStatsController.get);
