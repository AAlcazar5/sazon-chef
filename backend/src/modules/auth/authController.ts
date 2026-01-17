// backend/src/modules/auth/authController.ts
// Authentication controller for user registration, login, and password management

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt, isEncrypted } from '@/utils/encryption';

// Note: Request.user type is declared in authMiddleware.ts

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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
          error: 'Missing required fields',
          message: 'Email, password, and name are required'
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format'
        });
      }

      // Password validation (min 8 characters)
      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password too short',
          message: 'Password must be at least 8 characters long'
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
          error: 'User already exists',
          message: 'An account with this email already exists'
        });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

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

      // Generate JWT token (use decrypted email)
      const payload = { id: user.id, email: decryptedUser.email };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: decryptedUser,
        token
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Failed to register user',
        message: error.message
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
          error: 'Missing required fields',
          message: 'Email and password are required'
        });
      }

      // Find user - search by providerEmail first (unencrypted), then by encrypted email
      // For efficiency, we check providerEmail first, then only decrypt if needed
      let user = await prisma.user.findFirst({
        where: {
          providerEmail: email // Check unencrypted OAuth email first
        },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          emailEncrypted: true,
          nameEncrypted: true,
          providerEmail: true
        }
      });

      // If not found by providerEmail, search users with encrypted emails
      if (!user) {
        // Get all users with encrypted emails (most users will have this)
        const usersWithEncryptedEmails = await prisma.user.findMany({
          where: {
            emailEncrypted: true
          },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            emailEncrypted: true,
            nameEncrypted: true,
            providerEmail: true
          }
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
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              emailEncrypted: true,
              nameEncrypted: true,
              providerEmail: true
            }
          });
        }
      }

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check if user has a password (social login users may not have one)
      if (!user.password) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'This account uses social login. Please sign in with your social provider.'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Decrypt user data for response
      const decryptedEmail = user.emailEncrypted ? decrypt(user.email) : user.email;
      const decryptedName = user.nameEncrypted ? decrypt(user.name) : user.name;

      // Generate JWT token (use decrypted email for token)
      const payload = { id: user.id, email: decryptedEmail };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

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
        token
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Failed to login',
        message: error.message
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
      console.error('Get profile error:', error);
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
      console.error('Update profile error:', error);
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
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

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
      console.error('Change password error:', error);
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
          error: 'Missing required field',
          message: 'Email is required'
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format'
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

      // For security: Always return success even if user doesn't exist
      // This prevents email enumeration attacks
      if (!user) {
        return res.json({
          success: true,
          message: 'If an account exists with this email, a password reset code will be sent.'
        });
      }

      // Generate a simple 6-digit reset code for development
      // In production, you'd want to use a secure token and send via email
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store reset code in user record (you'll need to add these fields to schema in production)
      // For now, we'll just log it and return it in development mode
      console.log(`Password reset code for ${email}: ${resetCode}`);
      console.log(`Code expires at: ${resetCodeExpiry}`);

      // TODO: In production, send email with reset code
      // For development, return the code in the response
      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset code will be sent.',
        // Only in development - remove in production
        ...(process.env.NODE_ENV === 'development' && { resetCode, expiresAt: resetCodeExpiry })
      });
    } catch (error: any) {
      console.error('Request password reset error:', error);
      res.status(500).json({
        error: 'Failed to request password reset',
        message: error.message
      });
    }
  },

  /**
   * Reset password with email (simplified for development)
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Email and new password are required'
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format'
        });
      }

      // Password validation
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Password too short',
          message: 'New password must be at least 8 characters long'
        });
      }

      // Find user by email
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

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'No account found with this email address'
        });
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      res.json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.'
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: 'Failed to reset password',
        message: error.message
      });
    }
  }
};

