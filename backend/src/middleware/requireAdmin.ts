// ROADMAP 4.0 G2.4 — admin-gate middleware.
//
// Reads `User.isAdmin` for the authenticated user. Returns 403 when
// the flag is false. Order matters: place AFTER `authenticateToken`
// so `getUserId(req)` has a value to look up.

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    const user = (await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    })) as { isAdmin: boolean } | null;
    if (!user?.isAdmin) {
      res.status(403).json({ error: 'admin only' });
      return;
    }
    next();
  } catch (error) {
    logger.error({ err: error }, 'requireAdmin.failed');
    res.status(500).json({ error: 'admin check failed' });
  }
}
