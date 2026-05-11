// Group 10Y Phase 6: Coach memory CRUD endpoints (Pro-only).
// List, edit, and delete the long-term memories Sazon has learned about the user.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { requireCoachPro } from '@/middleware/requireCoachPro';
import { userActionLimiter } from '@/middleware/rateLimiter';

export const coachMemoryRoutes = Router();
coachMemoryRoutes.use(userActionLimiter);

const patchSchema = z.object({
  content: z.string().min(1).max(280).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

coachMemoryRoutes.get('/', requireCoachPro('memory'), async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const memories = await prisma.coachMemory.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  res.status(200).json(memories);
});

coachMemoryRoutes.patch(
  '/:id',
  requireCoachPro('memory'),
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_BODY' });
      return;
    }
    const owned = await prisma.coachMemory.findFirst({ where: { id, userId } });
    if (!owned) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    const updated = await prisma.coachMemory.update({
      where: { id },
      data: parsed.data,
    });
    res.status(200).json(updated);
  },
);

coachMemoryRoutes.delete(
  '/:id',
  requireCoachPro('memory'),
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;
    const owned = await prisma.coachMemory.findFirst({ where: { id, userId } });
    if (!owned) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    await prisma.coachMemory.delete({ where: { id } });
    res.status(204).end();
  },
);
