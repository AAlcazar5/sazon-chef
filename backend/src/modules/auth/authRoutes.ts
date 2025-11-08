// backend/src/modules/auth/authRoutes.ts
import { Router } from 'express';
import { authController } from './authController';
import { authenticateToken } from './authMiddleware';
import { authLimiter } from '@/middleware/rateLimiter';
import { validateRegistration, validateLogin } from '@/middleware/inputValidation';
import { socialAuthCallback, linkSocialAccount, unlinkSocialAccount } from './socialAuthController';

const router = Router();

// Public routes (no authentication required)
router.post('/register', authLimiter, validateRegistration, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/social/callback', authLimiter, socialAuthCallback);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/password', authenticateToken, authController.changePassword);
router.post('/social/link', authenticateToken, linkSocialAccount);
router.delete('/social/unlink', authenticateToken, unlinkSocialAccount);

export const authRoutes = router;
