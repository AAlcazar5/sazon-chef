// Pre-launch waitlist signup — public endpoint (no auth).
// Captures email + 3 quick selects so day-1 taste_profile can be pre-seeded.
// See plans/launch-marketing.md for the spec.

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

const waitlistSchema = z.object({
  email: z
    .preprocess(
      (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
      z.string().email().max(254),
    ),
  topCuisine: z.string().min(1).max(40).nullable().optional(),
  macroGoal: z
    .enum(['lighter', 'strong_lean', 'flavor_balanced', 'discovery'])
    .nullable()
    .optional(),
  dietary: z.array(z.string().min(1).max(20)).max(7).optional(),
  source: z.string().min(1).max(40).optional(),
});

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SignupResult {
  id: string;
  position: number;
}

export const waitlistController = {
  async signup(req: Request, res: Response<ApiResponse<SignupResult>>): Promise<Response> {
    const parsed = waitlistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'That email looks off — mind double-checking?',
      });
    }

    const { email, topCuisine, macroGoal, dietary, source } = parsed.data;
    const dietaryJson = JSON.stringify(dietary ?? []);

    try {
      const row = await prisma.waitlistSignup.upsert({
        where: { email },
        create: {
          email,
          topCuisine: topCuisine ?? null,
          macroGoal: macroGoal ?? null,
          dietary: dietaryJson,
          source: source ?? null,
        },
        update: {
          topCuisine: topCuisine ?? null,
          macroGoal: macroGoal ?? null,
          dietary: dietaryJson,
          ...(source ? { source } : {}),
        },
      });

      const position = await prisma.waitlistSignup.count();

      return res.json({
        success: true,
        data: { id: row.id, position },
      });
    } catch (err) {
      logger.error({ err }, 'waitlistController.signup failed');
      return res.status(500).json({
        success: false,
        error: 'Something went sideways. Mind trying again?',
      });
    }
  },
};
