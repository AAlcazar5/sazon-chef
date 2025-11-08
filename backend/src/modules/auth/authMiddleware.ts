// backend/src/modules/auth/authMiddleware.ts
// JWT authentication middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({
          error: 'Invalid token',
          message: 'Authentication token is invalid or expired. Please login again.'
        });
      }

      // Attach user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email
      };

      next();
    });
  } catch (error: any) {
    console.error('Authentication middleware error:', error);
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
      jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (!err && decoded) {
          req.user = {
            id: decoded.id,
            email: decoded.email
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

