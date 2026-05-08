// backend/src/modules/recap/weeklyRecapRoutes.ts
// ROADMAP 4.0 Tier C9 — Weekly recap routes.
// J13 — also mounts yearly Wrapped under the same /api/recap prefix.

import { Router } from 'express';
import { weeklyRecapController } from './weeklyRecapController';
import { yearlyRecapController } from './yearlyRecapController';

export const weeklyRecapRoutes = Router();
weeklyRecapRoutes.get('/this-week', weeklyRecapController.get);
weeklyRecapRoutes.get('/wrapped', yearlyRecapController.get);
