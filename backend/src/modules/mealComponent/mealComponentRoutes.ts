// backend/src/modules/mealComponent/mealComponentRoutes.ts
// Group 10X Phase 1+2+5+6 — routes for /api/meal-components, /api/composed-plates, /api/leftover-inventory.
//
// All Build-a-Plate controllers use isAuthenticated(req) which reads req.user
// (populated by authenticateToken middleware). Apply the middleware at the
// router level so every endpoint actually has req.user set — without it the
// isAuthenticated check returns false on a valid token and 401s back to the
// client, which the frontend interceptor treats as session-expired and force-
// logs-out the user.

import { Router } from 'express';
import { mealComponentController } from './mealComponentController';
import { authenticateToken } from '../auth/authMiddleware';

export const mealComponentRoutes = Router();
mealComponentRoutes.use(authenticateToken);
mealComponentRoutes.get('/', mealComponentController.list);
mealComponentRoutes.post('/permutations', mealComponentController.permutations);
mealComponentRoutes.get('/plate-from-pantry', mealComponentController.plateFromPantry);
mealComponentRoutes.get('/affinity', mealComponentController.slotAffinity);
mealComponentRoutes.get('/skill-tier', mealComponentController.getSkillTier);
mealComponentRoutes.get('/:id/variants', mealComponentController.listComponentVariants);
mealComponentRoutes.post('/:id/swap-away', mealComponentController.swapAway);

export const nutrientGapRoutes = Router();
nutrientGapRoutes.use(authenticateToken);
nutrientGapRoutes.get('/top', mealComponentController.getNutrientGapTop);

export const composedPlateRoutes = Router();
// /of-the-week is intentionally PUBLIC — editorial home card must work for
// unauthenticated visitors. Register it before the per-route auth middleware.
composedPlateRoutes.get('/of-the-week', mealComponentController.plateOfTheWeek);
// Static routes registered BEFORE /:id/* to avoid Express matching them as
// the `id` param (e.g. /weekly-summary would otherwise hit /:id/variations).
composedPlateRoutes.get('/weekly-summary', authenticateToken, mealComponentController.getWeeklyPlateSummary);
composedPlateRoutes.post('/', authenticateToken, mealComponentController.createPlate);
composedPlateRoutes.post('/auto-fit', authenticateToken, mealComponentController.autoFit);
composedPlateRoutes.post('/from-utterance', authenticateToken, mealComponentController.fromUtterance);
composedPlateRoutes.post('/family', authenticateToken, mealComponentController.createFamilyMeal);
composedPlateRoutes.post('/:id/timeline', authenticateToken, mealComponentController.plateTimeline);
composedPlateRoutes.post('/:id/mark-cooked', authenticateToken, mealComponentController.markPlateCooked);
composedPlateRoutes.post('/:id/share', authenticateToken, mealComponentController.sharePlate);
composedPlateRoutes.post('/:id/save', authenticateToken, mealComponentController.savePlate);
composedPlateRoutes.get('/:id/variations', authenticateToken, mealComponentController.plateVariations);

// Note: sharedPlateRoutes is intentionally PUBLIC — sharing a plate by slug
// must work without auth so unauthenticated users can preview before signup.
// The /sub-count subroute is authenticated (per-user pantry diff) and must
// be registered BEFORE the catch-all /:slug.
export const sharedPlateRoutes = Router();
sharedPlateRoutes.get('/:slug/sub-count', authenticateToken, mealComponentController.getSharedPlateSubCount);
sharedPlateRoutes.get('/:slug', mealComponentController.getSharedPlate);

export const leftoverInventoryRoutes = Router();
leftoverInventoryRoutes.use(authenticateToken);
leftoverInventoryRoutes.get('/', mealComponentController.listLeftovers);
