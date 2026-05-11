import { logger } from '../../utils/logger';
// backend/src/modules/auth/authMiddleware.ts
// JWT authentication middleware

import { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload, type VerifyErrors } from 'jsonwebtoken';
import { JWT_SECRET } from '@/utils/jwtConfig';

// H10: typed JWT payload. Tokens are minted in authController.login /
// register / socialAuth with `{ id, email }`. Centralizing the shape
// here means any future field rename surfaces as a compile error in
// every consumer instead of silently producing `undefined` at runtime.
export interface SazonJwtPayload extends JwtPayload {
  id: string;
  email: string;
}

function isSazonPayload(value: unknown): value is SazonJwtPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { email?: unknown }).email === 'string'
  );
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided. Please login first.'
      });
    }

    // Verify token
    jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, decoded: unknown) => {
      if (err || !isSazonPayload(decoded)) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Your session has expired. Please log in again.'
        });
      }

      // Attach user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
      };

      next();
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Authentication middleware error:');
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 * Useful for endpoints that work with or without authentication
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, decoded: unknown) => {
        if (!err && isSazonPayload(decoded)) {
          req.user = {
            id: decoded.id,
            email: decoded.email,
          };
        }
        next();
      });
    } else {
      next();
    }
  } catch (error: any) {
    // Continue without authentication if there's an error
    next();
  }
};

