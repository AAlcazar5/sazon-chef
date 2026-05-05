// backend/src/modules/dailyCheckIn/dailyCheckInRoutes.ts
// ROADMAP 4.0 Tier C7 — Daily check-in routes.

import { Router } from 'express';
import { dailyCheckInController } from './dailyCheckInController';

export const dailyCheckInRoutes = Router();
dailyCheckInRoutes.post('/', dailyCheckInController.upsert);
dailyCheckInRoutes.get('/', dailyCheckInController.list);
