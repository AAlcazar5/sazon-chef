// backend/src/utils/authHelper.ts
// Helper function to get authenticated user ID from request

import { Request } from 'express';

export class UnauthenticatedError extends Error {
  status = 401;
  code = 'UNAUTHENTICATED';
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Get authenticated user ID from request. Throws UnauthenticatedError if no
 * user is attached. Routes that need this MUST be mounted behind
 * `authenticateToken` — this throw is defense-in-depth, not a fallback.
 */
export const getUserId = (req: Request): string => {
  const id = req.user?.id;
  if (!id) {
    throw new UnauthenticatedError();
  }
  return id;
};

/**
 * Check if request is authenticated
 */
export const isAuthenticated = (req: Request): boolean => {
  return !!req.user?.id;
};
