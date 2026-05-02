// backend/src/modules/mealComponent/mealComponentRoutes.ts
// Group 10X Phase 1+2+5+6 — routes for /api/meal-components, /api/composed-plates, /api/leftover-inventory.

import { Router } from 'express';
import { mealComponentController } from './mealComponentController';

export const mealComponentRoutes = Router();
mealComponentRoutes.get('/', mealComponentController.list);
mealComponentRoutes.post('/permutations', mealComponentController.permutations);
mealComponentRoutes.get('/plate-from-pantry', mealComponentController.plateFromPantry);
mealComponentRoutes.get('/affinity', mealComponentController.slotAffinity);
mealComponentRoutes.post('/:id/swap-away', mealComponentController.swapAway);

export const composedPlateRoutes = Router();
composedPlateRoutes.post('/', mealComponentController.createPlate);
composedPlateRoutes.post('/auto-fit', mealComponentController.autoFit);
composedPlateRoutes.post('/from-utterance', mealComponentController.fromUtterance);
composedPlateRoutes.post('/family', mealComponentController.createFamilyMeal);
composedPlateRoutes.get('/of-the-week', mealComponentController.plateOfTheWeek);
composedPlateRoutes.post('/:id/timeline', mealComponentController.plateTimeline);
composedPlateRoutes.post('/:id/mark-cooked', mealComponentController.markPlateCooked);
composedPlateRoutes.post('/:id/share', mealComponentController.sharePlate);
composedPlateRoutes.post('/:id/save', mealComponentController.savePlate);

export const sharedPlateRoutes = Router();
sharedPlateRoutes.get('/:slug', mealComponentController.getSharedPlate);

export const leftoverInventoryRoutes = Router();
leftoverInventoryRoutes.get('/', mealComponentController.listLeftovers);
