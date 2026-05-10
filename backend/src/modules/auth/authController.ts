import { logger } from '../../utils/logger';
// backend/src/modules/auth/authController.ts
// Authentication controller for user registration, login, and password management

import { Request, Response } from 'express';
import { randomInt } from 'crypto';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from '@/utils/encryption';
import { emailService } from '@/services/emailService';
import { stripeService } from '@/services/stripeService';
import {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  RefreshTokenError,
} from '@/services/refreshTokenService';

// Note: Request.user type is declared in authMiddleware.ts

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// H4: bcrypt cost factor — bumped 10 → 12 to match 2024 OWASP guidance.
// Bcrypt cost is exponential: 12 ≈ 4× the work of 10. Hash time on a
// modern server is ~250ms vs ~60ms; still well under the 1s threshold
// that would harm login UX, while making offline brute-force ~16× slower.
const BCRYPT_ROUNDS = 12;

export const authController = {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      // Validation
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and name are required'
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid email address'
        });
      }

      // Password validation (min 8 characters)
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long'
        });
      }

      // Check if user already exists
      // Check providerEmail first (unencrypted OAuth emails)
      let existingUser = await prisma.user.findFirst({
        where: { providerEmail: email }
      });

      // If not found, check encrypted emails
      if (!existingUser) {
        const usersWithEncryptedEmails = await prisma.user.findMany({
          where: { emailEncrypted: true },
          select: { id: true, email: true, emailEncrypted: true }
        });

        for (const u of usersWithEncryptedEmails) {
          try {
            if (decrypt(u.email) === email) {
              existingUser = u as any;
              break;
            }
          } catch {
            continue;
          }
        }
      }

      // Also check unencrypted emails (legacy)
      if (!existingUser) {
        existingUser = await prisma.user.findFirst({
          where: { email, emailEncrypted: false }
        });
      }

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Encrypt email and name for data at rest
      const encryptedEmail = encrypt(email);
      const encryptedName = encrypt(name);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: encryptedEmail,
          name: encryptedName,
          password: hashedPassword,
          emailEncrypted: true,
          nameEncrypted: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailEncrypted: true,
          nameEncrypted: true,
          createdAt: true
        }
      });

      // Decrypt for response
      const decryptedUser = {
        ...user,
        email: decrypt(user.email),
        name: decrypt(user.name)
      };

      // Tier L H2 — issue both access + refresh tokens. Legacy `token` field
      // preserved for older mobile clients that haven't picked up the
      // refresh flow yet; new clients should consume `accessToken`.
      const pair = await issueTokenPair(
        { id: user.id, email: decryptedUser.email },
        { userAgent: req.headers?.['user-agent'] ?? null, ipAddress: req.ip ?? null },
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: decryptedUser,
        token: pair.accessToken,
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        accessTokenExpiresAt: pair.accessTokenExpiresAt,
        refreshTokenExpiresAt: pair.refreshTokenExpiresAt,
      });

      // Fire-and-forget: send welcome email + create Stripe customer
      emailService.sendWelcome(email, name).catch((err: unknown) => logger.error({ err }, 'auth.welcomeEmail.failed'));
      if (stripeService.isConfigured()) {
        stripeService.getOrCreateCustomer(user.id).catch((err: unknown) => logger.error({ err }, 'auth.stripeCustomer.failed'));
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Registration error:');
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  },

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Find user - search by providerEmail first (unencrypted), then by encrypted email
      // For efficiency, we check providerEmail first, then only decrypt if needed
      const userSelect = {
        id: true,
        email: true,
        name: true,
        password: true,
        emailEncrypted: true,
        nameEncrypted: true,
        providerEmail: true,
        emailVerified: true,
      } as const;

      let user = await prisma.user.findFirst({
        where: {
          providerEmail: email // Check unencrypted OAuth email first
        },
        select: userSelect,
      });

      // If not found by providerEmail, search users with encrypted emails
      if (!user) {
        // Get all users with encrypted emails (most users will have this)
        const usersWithEncryptedEmails = await prisma.user.findMany({
          where: {
            emailEncrypted: true
          },
          select: userSelect,
        });

        // Decrypt and find matching email
        for (const u of usersWithEncryptedEmails) {
          try {
            if (decrypt(u.email) === email) {
              user = u;
              break;
            }
          } catch {
            // Skip if decryption fails
            continue;
          }
        }

        // If still not found, check unencrypted emails (legacy users)
        if (!user) {
          user = await prisma.user.findFirst({
            where: {
              email: email,
              emailEncrypted: false
            },
            select: userSelect,
          });
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Email or password is incorrect'
        });
      }

      // Check if user has a password (social login users may not have one)
      if (!user.password) {
        return res.status(401).json({
          success: false,
          error: 'This account uses social login. Please sign in with your social provider.'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Email or password is incorrect'
        });
      }

      // Tier L H3 — email-verification gate.
      //
      // When `REQUIRE_EMAIL_VERIFICATION=true` (launch posture), unverified
      // users are blocked at the door with a stable `code` so the mobile
      // client can route to the "verify your email" wall. The flag stays off
      // by default so the gate doesn't lock out legacy accounts created
      // before email verification was wired end-to-end.
      const requireVerified =
        process.env.REQUIRE_EMAIL_VERIFICATION === 'true' || process.env.REQUIRE_EMAIL_VERIFICATION === '1';
      if (requireVerified && !user.emailVerified) {
        return res.status(403).json({
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          error: 'Please verify your email before signing in. Check your inbox for the verification link.',
        });
      }

      // Decrypt user data for response
      const decryptedEmail = user.emailEncrypted ? decrypt(user.email) : user.email;
      const decryptedName = user.nameEncrypted ? decrypt(user.name) : user.name;

      // Tier L H2 — issue access + refresh pair. `token` is preserved for
      // backwards compat with mobile clients that don't yet consume the
      // refresh flow; new clients should read `accessToken` + `refreshToken`.
      const pair = await issueTokenPair(
        { id: user.id, email: decryptedEmail },
        { userAgent: req.headers?.['user-agent'] ?? null, ipAddress: req.ip ?? null },
      );

      // Remove password and encryption flags from response
      const { password: _, emailEncrypted: __, nameEncrypted: ___, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          ...userWithoutPassword,
          email: decryptedEmail,
          name: decryptedName
        },
        token: pair.accessToken,
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        accessTokenExpiresAt: pair.accessTokenExpiresAt,
        refreshTokenExpiresAt: pair.refreshTokenExpiresAt,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Login error:');
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  },

  /**
   * Get authenticated user profile
   * GET /api/auth/profile
   */
  async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          emailEncrypted: true,
          nameEncrypted: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Decrypt user data
      const decryptedUser = {
        ...user,
        email: user.emailEncrypted ? decrypt(user.email) : user.email,
        name: user.nameEncrypted ? decrypt(user.name) : user.name
      };

      // Remove encryption flags from response
      const { emailEncrypted: _, nameEncrypted: __, ...userResponse } = decryptedUser;

      res.json({
        success: true,
        user: userResponse
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Get profile error:');
      res.status(500).json({
        error: 'Failed to fetch profile',
        message: error.message
      });
    }
  },

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const { name, email } = req.body;
      const updateData: any = {};

      if (name) {
        // Encrypt name for storage
        updateData.name = encrypt(name);
        updateData.nameEncrypted = true;
      }

      if (email) {
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            error: 'Invalid email format'
          });
        }

        // Check if email is already taken by another user
        // Need to check both encrypted and unencrypted emails
        const allUsers = await prisma.user.findMany({
          where: { id: { not: req.user.id } },
          select: {
            id: true,
            email: true,
            emailEncrypted: true,
            providerEmail: true
          }
        });

        const emailExists = allUsers.some(u => {
          if (u.providerEmail === email) return true;
          if (u.emailEncrypted) {
            try {
              return decrypt(u.email) === email;
            } catch {
              return false;
            }
          }
          return u.email === email;
        });

        if (emailExists) {
          return res.status(409).json({
            error: 'Email already in use',
            message: 'This email is already associated with another account'
          });
        }

        // Encrypt email for storage
        updateData.email = encrypt(email);
        updateData.emailEncrypted = true;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: 'No fields to update',
          message: 'Please provide at least one field to update (name or email)'
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          emailEncrypted: true,
          nameEncrypted: true,
          updatedAt: true
        }
      });

      // Decrypt for response
      const decryptedUser = {
        ...updatedUser,
        email: updatedUser.emailEncrypted ? decrypt(updatedUser.email) : updatedUser.email,
        name: updatedUser.nameEncrypted ? decrypt(updatedUser.name) : updatedUser.name
      };

      const { emailEncrypted: _, nameEncrypted: __, ...userResponse } = decryptedUser;

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: userResponse
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Update profile error:');
      res.status(500).json({
        error: 'Failed to update profile',
        message: error.message
      });
    }
  },

  /**
   * Change password
   * PUT /api/auth/password
   */
  async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Current password and new password are required'
        });
      }

      // Password validation
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Password too short',
          message: 'New password must be at least 8 characters long'
        });
      }

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          password: true
        }
      });

      if (!user || !user.password) {
        return res.status(400).json({
          error: 'Password change not available',
          message: 'This account does not have a password set (social login account)'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid password',
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Update password
      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword }
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Change password error:');
      res.status(500).json({
        error: 'Failed to change password',
        message: error.message
      });
    }
  },

  /**
   * Request password reset (simplified for development)
   * POST /api/auth/forgot-password
   */
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid email address'
        });
      }

      // Find user by email (check encrypted and unencrypted)
      let user = await prisma.user.findFirst({
        where: { providerEmail: email }
      });

      if (!user) {
        const usersWithEncryptedEmails = await prisma.user.findMany({
          where: { emailEncrypted: true },
          select: { id: true, email: true, emailEncrypted: true }
        });

        for (const u of usersWithEncryptedEmails) {
          try {
            if (decrypt(u.email) === email) {
              user = u as any;
              break;
            }
          } catch {
            continue;
          }
        }
      }

      if (!user) {
        user = await prisma.user.findFirst({
          where: { email, emailEncrypted: false }
        });
      }

      // Email enumeration defense: identical response message + status whether
      // or not the email matches a real account. Differing copy ("a password
      // reset code WILL be sent" vs "a code HAS been sent") is itself an
      // oracle. Use one canonical message for both branches.
      const ENUMERATION_SAFE_MESSAGE =
        'If an account exists with this email, a password reset code has been sent.';

      if (!user) {
        return res.json({
          success: true,
          message: ENUMERATION_SAFE_MESSAGE,
        });
      }

      // B1: 6-digit reset code from CSPRNG (was Math.random — brute-forceable).
      const resetCode = randomInt(100_000, 1_000_000).toString();
      const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store reset code in user record
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetCode,
          resetCodeExpiry
        }
      });

      res.json({
        success: true,
        message: ENUMERATION_SAFE_MESSAGE,
        // Only in development - return the code for testing
        ...(process.env.NODE_ENV === 'development' && { resetCode, expiresAt: resetCodeExpiry })
      });

      // Fire-and-forget: send password reset email
      emailService.sendPasswordReset(email, resetCode).catch((err: unknown) => logger.error({ err }, 'auth.passwordResetEmail.failed'));
    } catch (error: any) {
      logger.error({ err: error }, 'Request password reset error:');
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  },

  /**
   * Reset password with email (simplified for development)
   * POST /api/auth/reset-password
   */
  // B2: deleteAccount removed — see userController.deleteAccount which
  // requires { confirm: 'DELETE' } in the body. Apple 5.1.1 in-app
  // deletion requirement is satisfied by DELETE /api/user/account.

  async resetPassword(req: Request, res: Response) {
    try {
      const { email, resetCode, newPassword } = req.body;

      if (!email || !resetCode || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Email, reset code, and new password are required'
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid email address'
        });
      }

      // Password validation
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 8 characters long'
        });
      }

      // Find user by email
      let user = await prisma.user.findFirst({
        where: { providerEmail: email },
        select: {
          id: true,
          email: true,
          emailEncrypted: true,
          resetCode: true,
          resetCodeExpiry: true
        }
      });

      if (!user) {
        const usersWithEncryptedEmails = await prisma.user.findMany({
          where: { emailEncrypted: true },
          select: {
            id: true,
            email: true,
            emailEncrypted: true,
            resetCode: true,
            resetCodeExpiry: true
          }
        });

        for (const u of usersWithEncryptedEmails) {
          try {
            if (decrypt(u.email) === email) {
              user = u as any;
              break;
            }
          } catch {
            continue;
          }
        }
      }

      if (!user) {
        user = await prisma.user.findFirst({
          where: { email, emailEncrypted: false },
          select: {
            id: true,
            email: true,
            emailEncrypted: true,
            resetCode: true,
            resetCodeExpiry: true
          }
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'No account found with this email address'
        });
      }

      // Verify reset code
      if (!user.resetCode || !user.resetCodeExpiry) {
        return res.status(400).json({
          success: false,
          error: 'No reset code found. Please request a new password reset.'
        });
      }

      // Check if code matches
      if (user.resetCode !== resetCode) {
        return res.status(400).json({
          success: false,
          error: 'Invalid reset code. Please check the code and try again.'
        });
      }

      // Check if code has expired
      if (new Date() > user.resetCodeExpiry) {
        return res.status(400).json({
          success: false,
          error: 'Reset code has expired. Please request a new password reset.'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Update password and clear reset code
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetCode: null,
          resetCodeExpiry: null
        }
      });

      res.json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.'
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Reset password error:');
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  },

  /**
   * Verify email address via token
   * GET /api/auth/verify-email/:token
   */
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ success: false, error: 'Verification token is required' });
      }

      // Find user by reset code repurposed as verification token
      // In a production system you'd use a separate verification token table,
      // but for now we use a simple approach: the token is the user ID + timestamp hash
      const user = await prisma.user.findFirst({
        where: { resetCode: token },
      });

      if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid or expired verification link' });
      }

      // Check expiry (reuse resetCodeExpiry)
      if (user.resetCodeExpiry && new Date() > user.resetCodeExpiry) {
        return res.status(400).json({ success: false, error: 'Verification link has expired' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          resetCode: null,
          resetCodeExpiry: null,
        },
      });

      res.json({ success: true, message: 'Email verified successfully!' });
    } catch (error: any) {
      logger.error({ err: error }, 'Email verification error:');
      res.status(500).json({ success: false, error: 'Verification failed. Please try again.' });
    }
  },

  /**
   * Tier L H2 — exchange a refresh token for a new (access, refresh) pair.
   * The old refresh token is consumed (single-use rotation). If the same
   * refresh token is presented twice, that's a replay signal and every
   * refresh token for that user is revoked.
   *
   * POST /api/auth/refresh
   * Body: { refreshToken: string }
   */
  async refreshSession(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body ?? {};
      if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({ success: false, error: 'refreshToken is required' });
      }

      const pair = await rotateRefreshToken(refreshToken, {
        userAgent: req.headers?.['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      });

      return res.json({
        success: true,
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        accessTokenExpiresAt: pair.accessTokenExpiresAt,
        refreshTokenExpiresAt: pair.refreshTokenExpiresAt,
      });
    } catch (error: unknown) {
      if (error instanceof RefreshTokenError) {
        // 401 for any refresh-token failure — the client must redirect to
        // login. The `code` lets the client distinguish replay (force a
        // security alert) from plain expiry (silent re-login).
        return res.status(401).json({
          success: false,
          code: error.code,
          error: error.message,
        });
      }
      logger.error({ err: error }, 'auth.refreshSession.failed');
      return res.status(500).json({ success: false, error: 'Could not refresh session' });
    }
  },

  /**
   * Tier L H2 — invalidate a refresh token (logout from this device).
   * Idempotent: returns 200 even when the token is unknown / already
   * revoked, so a stale client logging out doesn't throw.
   *
   * Optional body field `everywhere: true` revokes every refresh token for
   * the authenticated user (logout-all). That branch requires a valid
   * access token via `req.user`.
   *
   * POST /api/auth/logout
   * Body: { refreshToken?: string, everywhere?: boolean }
   */
  async logout(req: Request, res: Response) {
    try {
      const { refreshToken, everywhere } = req.body ?? {};

      if (everywhere === true) {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ success: false, error: 'Authentication required for logout-all' });
        }
        const count = await revokeAllRefreshTokensForUser(userId);
        return res.json({ success: true, revoked: count });
      }

      if (typeof refreshToken === 'string' && refreshToken.length > 0) {
        await revokeRefreshToken(refreshToken);
      }
      return res.json({ success: true });
    } catch (error: unknown) {
      logger.error({ err: error }, 'auth.logout.failed');
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }
  }
};

