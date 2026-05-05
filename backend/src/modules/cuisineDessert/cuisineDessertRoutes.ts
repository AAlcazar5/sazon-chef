// backend/src/modules/cuisineDessert/cuisineDessertRoutes.ts
// ROADMAP 4.0 F2.

import { Router } from 'express';
import { authenticateToken } from '@modules/auth/authMiddleware';
import { cuisineDessertController } from './cuisineDessertController';

const router = Router();

router.get('/rates', authenticateToken, cuisineDessertController.getRates);
router.post('/no-results', authenticateToken, cuisineDessertController.logNoResults);
router.get('/:cuisine', authenticateToken, cuisineDessertController.getForCuisine);

export { router as cuisineDessertRoutes };
