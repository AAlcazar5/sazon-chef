import { logger } from '../../utils/logger';
// backend/src/modules/recipe/newToYouController.ts
//
// Group 11 Phase 5 — "New to you" feed + "Browse by Region" family ranking.
//
// Thin HTTP handlers around the two services. Lives in its own file rather
// than the 4500-line recipeController so the Phase 5 surface stays easy
// to find and test without dragging the rest of the recipe controller in.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import { buildNewToYouFeed } from '@/services/newToYouFeedService';
import { buildBrowseByFamily } from '@/services/browseByFamilyService';

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
      logger.error({ err: error }, 'Error building new-to-you feed:');
      res.status(500).json({ error: 'Failed to build new-to-you feed' });
    }
  },

  /**
   * GET /api/recipes/browse-by-family
   *
   * Returns CUISINE_FAMILIES annotated with this user's affinity, ordered:
   *   1. Highest-affinity families first
   *   2. Within zero-affinity families: those flagged "New for you" first
   *   3. Then alphabetical
   *
   * Response shape:
   *   [{
   *     family: string,
   *     cuisines: string[],
   *     affinityScore: number,
   *     exploredCuisines: string[],
   *     isExplored: boolean,
   *     hasNewForYou: boolean,
   *   }, ...]
   */
  async getBrowseByFamily(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const families = await buildBrowseByFamily(userId);
      res.json({ families });
    } catch (error: any) {
      logger.error({ err: error }, 'Error building browse-by-family:');
      res.status(500).json({ error: 'Failed to build family browse' });
    }
  },
};
