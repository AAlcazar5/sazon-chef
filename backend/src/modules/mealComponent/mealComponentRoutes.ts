// backend/src/modules/mealComponent/mealComponentRoutes.ts
// Group 10X Phase 1 — routes for /api/meal-components and /api/composed-plates.

import { Router } from 'express';
import { mealComponentController } from './mealComponentController';

export const mealComponentRoutes = Router();
mealComponentRoutes.get('/', mealComponentController.list);

export const composedPlateRoutes = Router();
composedPlateRoutes.post('/', mealComponentController.createPlate);
