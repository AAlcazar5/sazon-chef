// backend/src/modules/nutrition/nutritionRoutes.ts
// ROADMAP 4.0 D14 — discovery-surface read routes.

import { Router } from 'express';
import { authenticateToken } from '@modules/auth/authMiddleware';
import { nutritionController } from './nutritionController';

const router = Router();

router.get('/recipe/:id', authenticateToken, nutritionController.getRecipe);
router.get('/daily', authenticateToken, nutritionController.getDaily);

export { router as nutritionRoutes };
