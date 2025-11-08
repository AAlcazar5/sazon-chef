// backend/src/utils/authHelper.ts
// Helper function to get authenticated user ID from request

import { Request } from 'express';

/**
 * Get authenticated user ID from request
 * Falls back to 'temp-user-id' for backward compatibility during migration
 */
export const getUserId = (req: Request): string => {
  return req.user?.id || 'temp-user-id';
};

/**
 * Check if request is authenticated
 */
export const isAuthenticated = (req: Request): boolean => {
  return !!req.user?.id;
};

