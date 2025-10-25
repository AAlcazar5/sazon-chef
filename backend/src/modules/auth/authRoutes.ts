// backend/src/modules/auth/authRoutes.ts
import { Router } from 'express';
import { authController } from './authController';
import { authenticateToken } from './authMiddleware';

const router = Router();

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/password', authenticateToken, authController.changePassword);

export const authRoutes = router;
