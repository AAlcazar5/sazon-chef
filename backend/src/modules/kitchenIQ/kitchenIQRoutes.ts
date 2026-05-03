// Group 10S: Kitchen IQ routes — /api/user/kitchen-iq/progress

import { Router } from 'express';
import { kitchenIQController } from './kitchenIQController';
import { authenticateToken } from '../auth/authMiddleware';

export const kitchenIQRoutes = Router();
kitchenIQRoutes.use(authenticateToken);
kitchenIQRoutes.get('/progress', kitchenIQController.getProgress);
