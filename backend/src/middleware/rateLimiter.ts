import { logger } from '../utils/logger';
// backend/src/middleware/rateLimiter.ts
// Rate limiting middleware for API endpoints

import type { Request } from 'express';
import rateLimit from 'express-rate-limit';

// Check if we're in development mode. Test env (NODE_ENV=test, set by Jest)
// also disables limits so test suites that fire many requests don't hit 429.
const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

if (isDevelopment) {
  logger.info('🔓 [RateLimiter] Development mode detected - rate limiting DISABLED');
}

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 * Disabled in development mode
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? Number.MAX_SAFE_INTEGER : 100, // No limit in development
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    if (isDevelopment) {
      return true; // Always skip in development
    }
    return false;
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 * Disabled in development mode
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? Number.MAX_SAFE_INTEGER : 5, // No limit in development
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login/registration attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: (req) => {
    if (isDevelopment) {
      return true; // Always skip in development
    }
    return false;
  },
});

/**
 * Moderate rate limiter for AI endpoints
 * 20 requests per hour per IP
 * Disabled in development mode
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? Number.MAX_SAFE_INTEGER : 20, // No limit in development
  message: {
    error: 'Too many AI requests',
    message: 'Too many AI generation requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (isDevelopment) {
      return true; // Always skip in development
    }
    return false;
  },
});

/**
 * Per-user rate limiter for Coach message endpoints. Coach turns spawn an
 * Anthropic tool-use loop with high token cost — IP keying alone is not
 * enough because multiple users share an IP and a single user can rotate IPs.
 * Falls back to IP if userId is somehow missing (route MUST be auth-gated).
 */
export const coachMessageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? Number.MAX_SAFE_INTEGER : 30,
  message: {
    error: 'Too many Coach messages',
    message: 'Too many Coach messages this hour. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id || req.ip || 'anonymous',
  skip: () => isDevelopment,
});

