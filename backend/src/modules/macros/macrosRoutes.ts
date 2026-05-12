// Build-a-Plate Phase 10 — /api/macros routes.
// See plans/product.md#build-a-plate Phase 10 spec.

import { Router } from 'express';
import { macrosController } from './macrosController';
import { authenticateToken } from '../auth/authMiddleware';
import { macroEstimateLimiter } from '@/middleware/rateLimiter';

export const macrosRoutes = Router();
macrosRoutes.use(authenticateToken);
macrosRoutes.post('/estimate', macroEstimateLimiter, macrosController.estimate);
