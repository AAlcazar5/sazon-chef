// ROADMAP 4.0 T0.1 — PUT /api/user/tonight-mode router.
//
// Mini-router so the toggle ships independently of the rest of userController.
// Mounted under /api/user (which already runs `authenticateToken`).

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getUserId } from '@/utils/authHelper';
import {
  setUserTonightModeEnabled,
  setUserTonightModePromptedAt,
} from '../../services/featureFlagService';
import { logger } from '../../utils/logger';

const bodySchema = z.object({
  enabled: z.boolean(),
  dismissPrompt: z.boolean().optional(),
});

const router = Router();

router.put('/tonight-mode', async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body' });
  }
  const userId = getUserId(req);
  const { enabled, dismissPrompt } = parsed.data;

  try {
    const result = await setUserTonightModeEnabled(userId, enabled);
    if (!result.ok) {
      return res.status(403).json({ error: result.reason ?? 'forbidden' });
    }
    if (dismissPrompt) {
      await setUserTonightModePromptedAt(userId, new Date());
    }
    return res.status(200).json({ tonightModeEnabled: enabled });
  } catch (err) {
    logger.error({ err }, 'tonight-mode toggle failed');
    return res.status(500).json({ error: 'internal' });
  }
});

export const tonightModeRouter = router;
