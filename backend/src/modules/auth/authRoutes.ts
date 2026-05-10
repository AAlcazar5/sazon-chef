// backend/src/modules/auth/authRoutes.ts
import { Router } from 'express';
import { authController } from './authController';
import { authenticateToken } from './authMiddleware';
import { authLimiter } from '@/middleware/rateLimiter';
import { validateRegistration, validateLogin } from '@/middleware/inputValidation';
import { socialAuthCallback, linkSocialAccount, unlinkSocialAccount } from './socialAuthController';
import { getWelcomeBack } from './welcomeBackController';

const router = Router();

// Public routes (no authentication required)
router.post('/register', authLimiter, validateRegistration, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/social/callback', authLimiter, socialAuthCallback);
router.post('/forgot-password', authLimiter, authController.requestPasswordReset);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// Tier L H2 — refresh-token rotation. Public because the access token may
// be expired by definition; the refresh token in the body is the credential.
router.post('/refresh', authLimiter, authController.refreshSession);
// Logout invalidates the refresh token. Public so it works after access
// token expiry; idempotent on unknown tokens.
router.post('/logout', authLimiter, authController.logout);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/password', authenticateToken, authController.changePassword);
// B2: DELETE /api/auth/account removed — was unguarded (no confirm body).
// Account deletion lives at DELETE /api/user/account, which requires
// { "confirm": "DELETE" } in the body.
router.post('/social/link', authenticateToken, linkSocialAccount);
router.delete('/social/unlink', authenticateToken, unlinkSocialAccount);

// ROADMAP 4.0 A7.4 — Welcome-back peak.
router.get('/welcome-back', authenticateToken, getWelcomeBack);

export const authRoutes = router;
