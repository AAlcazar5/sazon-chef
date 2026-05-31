// Tier Q — Beta feedback intake.
//
// Validates beta-tester feedback, persists to `BetaFeedback` and emits a
// structured log breadcrumb. Public route (no auth header required) so
// testers can submit while signed out; userId stays null in that case.

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '../../utils/logger';

const feedbackSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  screen: z.string().max(200).optional(),
  platform: z.enum(['ios', 'android', 'web']).optional(),
  appVersion: z.string().max(40).optional(),
  buildNumber: z.string().max(20).optional(),
  device: z.string().max(80).optional(),
  nps: z.number().int().min(0).max(10).optional(),
});

interface FeedbackResponse {
  success: boolean;
  data?: { id: string };
  error?: string;
}

export const feedbackController = {
  async create(req: Request, res: Response<FeedbackResponse>): Promise<Response> {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues;
      const firstPath = issues[0]?.path?.join('.') || 'payload';
      return res.status(400).json({
        success: false,
        error: `Invalid ${firstPath}`,
      });
    }

    const userId = (req as Request & { userId?: string }).userId ?? null;

    try {
      const row = await prisma.betaFeedback.create({
        data: {
          userId,
          message: parsed.data.message,
          screen: parsed.data.screen,
          platform: parsed.data.platform,
          appVersion: parsed.data.appVersion,
          buildNumber: parsed.data.buildNumber,
          device: parsed.data.device,
          nps: parsed.data.nps,
        },
        select: { id: true },
      });

      logger.info(
        { feedbackId: row.id, userId, nps: parsed.data.nps, screen: parsed.data.screen },
        'tier_q.feedback.received',
      );

      return res.status(201).json({ success: true, data: { id: row.id } });
    } catch (err) {
      logger.error({ err }, 'tier_q.feedback.persist_failed');
      return res
        .status(500)
        .json({ success: false, error: "Couldn't save feedback right now" });
    }
  },
};
