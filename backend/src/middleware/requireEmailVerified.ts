// Tier L H3 — email-verification gate middleware.
//
// Reads `User.emailVerified` for the authenticated user. Returns 403 with a
// stable `code: 'EMAIL_NOT_VERIFIED'` when the flag is false so the mobile
// client can route to the "verify your email" wall.
//
// Order matters: place AFTER `authenticateToken` so `getUserId(req)` has a
// value to look up.
//
// Soft-gated by `REQUIRE_EMAIL_VERIFICATION` — when the env var is unset or
// not 'true' / '1', the middleware is a no-op (lets unverified users through
// while we ramp the verification flow without locking out legacy accounts).

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

function isEnforced(): boolean {
  const v = process.env.REQUIRE_EMAIL_VERIFICATION;
  return v === 'true' || v === '1';
}

export async function requireEmailVerified(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!isEnforced()) {
    next();
    return;
  }
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!user?.emailVerified) {
      res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        error: 'Please verify your email before continuing. Check your inbox for the verification link.',
      });
      return;
    }
    next();
  } catch (error) {
    logger.error({ err: error }, 'requireEmailVerified.failed');
    res.status(500).json({ error: 'email verification check failed' });
  }
}
