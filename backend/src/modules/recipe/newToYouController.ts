// backend/src/modules/recipe/newToYouController.ts
//
// Group 11 Phase 5 — "New to you" personalized adjacency feed.
//
// Thin HTTP handler around `buildNewToYouFeed`. Lives in its own file
// rather than the 4500-line recipeController so the feature stays easy
// to find and test without dragging the rest of recipe surface in.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import { buildNewToYouFeed } from '@/services/newToYouFeedService';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;

export const newToYouController = {
  /**
   * GET /api/recipes/new-to-you?limit=<n>
   *
   * Returns a personalized list of recipes from cuisines adjacent to —
   * but not yet explored by — the caller. Cold-start cases (no cooking
   * history) fall back to the user's onboarding-time likedCuisines.
   *
   * Response shape:
   *   {
   *     recipes: [{ ...recipe, personalizationReason, sourceCuisine }],
   *     isColdStart: boolean,
   *     sourceCuisines: string[],
   *     adjacentCuisines: string[],
   *   }
   */
  async getNewToYou(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const rawLimit = parseInt(req.query.limit as string, 10);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(MAX_LIMIT, rawLimit)
        : DEFAULT_LIMIT;

      const feed = await buildNewToYouFeed(userId, { limit });

      res.json(feed);
    } catch (error: any) {
      console.error('Error building new-to-you feed:', error);
      res.status(500).json({ error: 'Failed to build new-to-you feed' });
    }
  },
};
