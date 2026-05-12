// Build-a-Plate Phase 10 — POST /api/macros/estimate.
// Estimates per-portion macros for a free-text custom item via USDA → LLM hybrid.
// See plans/product.md#build-a-plate Phase 10 spec.

import type { Request, Response } from 'express';
import { z } from 'zod';
import { estimateMacros } from '@/services/macroEstimationService';
import { logger } from '@/utils/logger';

const SLOTS = ['protein', 'base', 'vegetable', 'sauce', 'garnish'] as const;

const estimateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  portionGrams: z.number().positive().max(5000),
  slot: z.enum(SLOTS),
});

export const macrosController = {
  async estimate(req: Request, res: Response): Promise<Response> {
    const parsed = estimateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Check the food name, portion size, and slot.',
      });
    }

    try {
      const result = await estimateMacros(parsed.data);
      return res.status(200).json(result);
    } catch (err) {
      logger.error({ err, body: parsed.data }, 'macrosController.estimate failed');
      return res.status(500).json({
        error: 'estimation_failed',
        message: "Sazon couldn't read that one — try a simpler name.",
      });
    }
  },
};
