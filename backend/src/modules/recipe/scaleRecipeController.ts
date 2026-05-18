// backend/src/modules/recipe/scaleRecipeController.ts
//
// W-A1b — POST /api/recipes/:id/scale. Deterministic scale (W-A2 util) +
// byproduct Cook Log capture (W-A1). Its own small module rather than another
// method on the already-oversized recipeController. The scale event is logged
// as a *byproduct* of an action the user already took (the design law from
// the office-hours interrogation) — capture must NEVER break the user's
// scale result, so it is best-effort + logged on failure.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import {
  scaleIngredients,
  scaleRecipeToTarget,
  type ScalableIngredient,
} from '@/utils/scaleRecipe';
import { recordCookEvent } from '@/services/cookEventService';
import { logger } from '../../utils/logger';

export const scaleRecipeController = {
  async scaleRecipeEndpoint(req: Request, res: Response): Promise<Response> {
    try {
      const userId = getUserId(req);
      const recipeId = req.params.id;
      const body = (req.body ?? {}) as {
        ingredients?: ScalableIngredient[];
        factor?: number;
        referenceName?: string;
        target?: { amount: number; unit: string };
      };

      const ingredients = body.ingredients;
      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: 'ingredients[] is required' });
      }

      let scaled: ScalableIngredient[];
      let payload: Record<string, unknown>;
      if (typeof body.factor === 'number') {
        scaled = scaleIngredients(ingredients, body.factor);
        payload = { mode: 'factor', factor: body.factor };
      } else if (
        body.referenceName &&
        body.target &&
        typeof body.target.amount === 'number' &&
        typeof body.target.unit === 'string'
      ) {
        scaled = scaleRecipeToTarget(ingredients, body.referenceName, body.target);
        payload = {
          mode: 'target',
          referenceName: body.referenceName,
          target: body.target,
        };
      } else {
        return res.status(400).json({
          error:
            'provide { factor } or { referenceName, target: { amount, unit } }',
        });
      }

      // Byproduct capture — non-blocking. A logging failure must not deny the
      // user the scaled result they asked for.
      try {
        await recordCookEvent({ userId, recipeId, type: 'scale', payload });
      } catch (err) {
        logger.error(
          { err, recipeId },
          'cook-log: scale event capture failed (non-blocking)',
        );
      }

      return res.json({ scaled });
    } catch (err) {
      // scaleIngredients / scaleRecipeToTarget throw on a bad factor,
      // incompatible units, or a missing reference ingredient.
      const message = err instanceof Error ? err.message : 'scale failed';
      return res.status(400).json({ error: message });
    }
  },
};
