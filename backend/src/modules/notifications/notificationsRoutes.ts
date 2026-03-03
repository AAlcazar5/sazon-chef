// backend/src/modules/notifications/notificationsRoutes.ts
import { Router } from 'express';
import { notificationsController } from './notificationsController';
import { authenticateToken } from '@modules/auth/authMiddleware';
import { zodValidate } from '@/middleware/zodValidate';
import { registerTokenSchema } from '@/middleware/schemas';

const router = Router();

// Push token management (all protected)
router.post('/register-token', authenticateToken, zodValidate(registerTokenSchema), notificationsController.registerToken);
router.delete('/unregister-token', authenticateToken, notificationsController.unregisterToken);

export const notificationsRoutes = router;
