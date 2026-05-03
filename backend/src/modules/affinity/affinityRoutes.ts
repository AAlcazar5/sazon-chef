// Group 10R-Phase2: /api/user/affinity-snapshot

import { Router } from 'express';
import { affinityController } from './affinityController';
import { authenticateToken } from '../auth/authMiddleware';

export const affinityRoutes = Router();
affinityRoutes.use(authenticateToken);
affinityRoutes.get('/snapshot', affinityController.getSnapshot);
