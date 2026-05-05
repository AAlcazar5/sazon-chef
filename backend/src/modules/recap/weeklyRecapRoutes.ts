// backend/src/modules/recap/weeklyRecapRoutes.ts
// ROADMAP 4.0 Tier C9 — Weekly recap routes.

import { Router } from 'express';
import { weeklyRecapController } from './weeklyRecapController';

export const weeklyRecapRoutes = Router();
weeklyRecapRoutes.get('/this-week', weeklyRecapController.get);
