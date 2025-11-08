// backend/src/modules/auth/socialAuthController.ts
// Social authentication controller for Google and Apple OAuth

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from '@/utils/encryption';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

interface SocialAuthRequest extends Request {
  body: {
    provider: 'google' | 'apple';
    providerId: string;
    email: string;
    name: string;
    idToken?: string; // For Apple Sign In
    accessToken?: string; // For Google
  };
}

/**
 * Handle social login callback (Google or Apple)
 * POST /api/auth/social/callback
 */
export async function socialAuthCallback(req: SocialAuthRequest, res: Response) {
  try {
    const { provider, providerId, email, name, idToken, accessToken } = req.body;

    // Validation
    if (!provider || !providerId || !email || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Provider, providerId, email, and name are required'
      });
    }

    if (provider !== 'google' && provider !== 'apple') {
      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Provider must be "google" or "apple"'
      });
    }

    // Verify token (basic validation - in production, verify with provider)
    // For now, we'll trust the client but in production you should verify:
    // - Google: Verify idToken with Google's API
    // - Apple: Verify idToken with Apple's API
    
    // Check if user exists by providerId or email
    // First check by providerId (most efficient)
    let user = await prisma.user.findFirst({
      where: {
        provider,
        providerId
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailEncrypted: true,
        nameEncrypted: true,
        provider: true,
        providerId: true,
        providerEmail: true,
        createdAt: true
      }
    });

    // If not found by providerId, check by providerEmail (unencrypted OAuth email)
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          providerEmail: email
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailEncrypted: true,
          nameEncrypted: true,
          provider: true,
          providerId: true,
          providerEmail: true,
          createdAt: true
        }
      });
    }

    // If still not found, check by decrypting emails (for users who registered with email/password)
    if (!user) {
      const usersWithEncryptedEmails = await prisma.user.findMany({
        where: {
          emailEncrypted: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailEncrypted: true,
          nameEncrypted: true,
          provider: true,
          providerId: true,
          providerEmail: true,
          createdAt: true
        }
      });

      for (const u of usersWithEncryptedEmails) {
        try {
          if (decrypt(u.email) === email) {
            user = u;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    if (user) {
      // Update user if provider info changed
      if (user.provider !== provider || user.providerId !== providerId) {
        const updateData: any = {
          provider,
          providerId,
          providerEmail: email
        };

        // Update name if provided and encrypt it
        if (name) {
          updateData.name = encrypt(name);
          updateData.nameEncrypted = true;
        }

        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          select: {
            id: true,
            email: true,
            name: true,
            emailEncrypted: true,
            nameEncrypted: true,
            provider: true,
            providerId: true,
            providerEmail: true,
            createdAt: true
          }
        });
      }
    } else {
      // Create new user
      // Encrypt email and name for data at rest
      const encryptedEmail = encrypt(email);
      const encryptedName = encrypt(name);

      user = await prisma.user.create({
        data: {
          email: encryptedEmail, // Store encrypted
          name: encryptedName, // Store encrypted
          provider,
          providerId,
          providerEmail: email, // Keep unencrypted for OAuth lookups
          emailEncrypted: true,
          nameEncrypted: true,
          password: null // No password for social login
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailEncrypted: true,
          nameEncrypted: true,
          provider: true,
          providerId: true,
          providerEmail: true,
          createdAt: true
        }
      });
    }

    // Ensure user is not null
    if (!user) {
      return res.status(500).json({
        error: 'Failed to create or retrieve user'
      });
    }

    // Decrypt user data for response
    const decryptedEmail = user.emailEncrypted ? decrypt(user.email) : user.email;
    const decryptedName = user.nameEncrypted ? decrypt(user.name) : user.name;

    // Generate JWT token (use decrypted email)
    const payload = { id: user.id, email: decryptedEmail };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

    // Remove encryption flags from response
    const { emailEncrypted: _, nameEncrypted: __, ...userWithoutFlags } = user;

    res.json({
      success: true,
      message: 'Social login successful',
      user: {
        ...userWithoutFlags,
        email: decryptedEmail,
        name: decryptedName
      },
      token
    });
  } catch (error: any) {
    console.error('Social auth error:', error);
    res.status(500).json({
      error: 'Failed to authenticate',
      message: error.message
    });
  }
}

/**
 * Link social account to existing user
 * POST /api/auth/social/link
 */
export async function linkSocialAccount(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { provider, providerId, email, name, idToken, accessToken } = req.body;

    if (!provider || !providerId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Provider and providerId are required'
      });
    }

    // Check if provider account is already linked to another user
    const existingLink = await prisma.user.findFirst({
      where: {
        provider,
        providerId,
        id: { not: req.user.id }
      }
    });

    if (existingLink) {
      return res.status(409).json({
        error: 'Account already linked',
        message: 'This social account is already linked to another user'
      });
    }

    // Update user with social provider info
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        provider,
        providerId,
        providerEmail: email || undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        provider: true,
        providerId: true
      }
    });

    res.json({
      success: true,
      message: 'Social account linked successfully',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Link social account error:', error);
    res.status(500).json({
      error: 'Failed to link social account',
      message: error.message
    });
  }
}

/**
 * Unlink social account from user
 * DELETE /api/auth/social/unlink
 */
export async function unlinkSocialAccount(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Provider is required'
      });
    }

    // Check if user has a password (can't unlink if no other auth method)
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true, provider: true }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Can't unlink if it's the only auth method and no password
    if (user.provider === provider && !user.password) {
      return res.status(400).json({
        error: 'Cannot unlink',
        message: 'Cannot unlink the only authentication method. Please set a password first.'
      });
    }

    // Unlink the provider
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        provider: user.provider === provider ? null : user.provider,
        providerId: user.provider === provider ? null : undefined,
        providerEmail: user.provider === provider ? null : undefined
      }
    });

    res.json({
      success: true,
      message: 'Social account unlinked successfully'
    });
  } catch (error: any) {
    console.error('Unlink social account error:', error);
    res.status(500).json({
      error: 'Failed to unlink social account',
      message: error.message
    });
  }
}

