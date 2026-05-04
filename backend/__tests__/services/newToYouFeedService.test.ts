// backend/__tests__/services/newToYouFeedService.test.ts
// Group 11 Phase 5 — "New to you" personalized adjacency feed.
//
// Algorithm under test:
//   1. Compute cuisine affinity from cookingLog + savedRecipe
//   2. Cold-start: fall back to onboarding likedCuisines if no signal
//   3. Surface recipes from cuisines ADJACENT to user's affinity, NOT
//      cuisines they've already cooked (the whole point is exposure to
//      adjacent unexplored cuisines).
//   4. Each surfaced recipe carries a `personalizationReason` string.

const mockCookingLogFindMany = jest.fn();
const mockSavedRecipeFindMany = jest.fn();
const mockUserPrefsFindUnique = jest.fn();
const mockRecipeFindMany = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    cookingLog: { findMany: (...a: unknown[]) => mockCookingLogFindMany(...a) },
    savedRecipe: { findMany: (...a: unknown[]) => mockSavedRecipeFindMany(...a) },
    userPreferences: { findUnique: (...a: unknown[]) => mockUserPrefsFindUnique(...a) },
    recipe: { findMany: (...a: unknown[]) => mockRecipeFindMany(...a) },
  },
}));

import { buildNewToYouFeed } from '../../src/services/newToYouFeedService';

describe('newToYouFeedService.buildNewToYouFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookingLogFindMany.mockResolvedValue([]);
    mockSavedRecipeFindMany.mockResolvedValue([]);
    mockUserPrefsFindUnique.mockResolvedValue(null);
    mockRecipeFindMany.mockResolvedValue([]);
  });

  describe('cold start (no cooking history, no saves)', () => {
    it('returns isColdStart=true and seeds from onboarding likedCuisines', async () => {
      mockUserPrefsFindUnique.mockResolvedValueOnce({
        likedCuisines: [{ name: 'Thai' }, { name: 'Persian' }],
      });
      // Recipes fetched from cuisines adjacent to Thai/Persian
      mockRecipeFindMany.mockResolvedValueOnce([
        { id: 'r1', title: 'Burmese Tea Leaf Salad', cuisine: 'Burmese' },
        { id: 'r2', title: 'Pho Bo', cuisine: 'Vietnamese' },
      ]);

      const result = await buildNewToYouFeed('user-1', { limit: 4 });

      expect(result.isColdStart).toBe(true);
      expect(result.sourceCuisines).toEqual(expect.arrayContaining(['Thai', 'Persian']));
      expect(result.recipes.length).toBeGreaterThan(0);
    });

    it('returns empty result when neither cooking history nor onboarding cuisines exist', async () => {
      mockUserPrefsFindUnique.mockResolvedValueOnce({ likedCuisines: [] });

      const result = await buildNewToYouFeed('user-1', { limit: 4 });

      expect(result.isColdStart).toBe(true);
      expect(result.sourceCuisines).toEqual([]);
      expect(result.recipes).toEqual([]);
      // No recipe query when there's no source
      expect(mockRecipeFindMany).not.toHaveBeenCalled();
    });

    it('attaches a cold-start-flavored personalizationReason to each recipe', async () => {
      mockUserPrefsFindUnique.mockResolvedValueOnce({ likedCuisines: [{ name: 'Thai' }] });
      mockRecipeFindMany.mockResolvedValueOnce([
        { id: 'r1', title: 'Vietnamese Pho', cuisine: 'Vietnamese' },
      ]);

      const result = await buildNewToYouFeed('user-1', { limit: 4 });

      expect(result.recipes[0].personalizationReason).toMatch(/onboarding|picked|Thai/i);
      expect(result.recipes[0].sourceCuisine).toBe('Thai');
    });
  });

  describe('warm start (has cooking history)', () => {
    it('returns isColdStart=false and uses cooking history as the affinity signal', async () => {
      mockCookingLogFindMany.mockResolvedValueOnce([
        { recipe: { cuisine: 'Thai' } },
        { recipe: { cuisine: 'Thai' } },
        { recipe: { cuisine: 'Mexican' } },
      ]);
      mockRecipeFindMany.mockResolvedValueOnce([
        { id: 'r1', title: 'Burmese Khao Soi', cuisine: 'Burmese' },
      ]);

      const result = await buildNewToYouFeed('user-1', { limit: 4 });

      expect(result.isColdStart).toBe(false);
      expect(result.sourceCuisines).toEqual(expect.arrayContaining(['Thai']));
    });

    it('weights cooks 2x heavier than saves when computing affinity', async () => {
      mockCookingLogFindMany.mockResolvedValueOnce([
        // 1 cook of Thai
        { recipe: { cuisine: 'Thai' } },
      ]);
      mockSavedRecipeFindMany.mockResolvedValueOnce([
        // 3 saves of Mexican (3 saves = 3 score; 1 cook = 2 score → Thai still loses)
        { recipe: { cuisine: 'Mexican' } },
        { recipe: { cuisine: 'Mexican' } },
        { recipe: { cuisine: 'Mexican' } },
      ]);
      mockRecipeFindMany.mockResolvedValueOnce([]);

      const result = await buildNewToYouFeed('user-1', { limit: 4 });

      // Mexican (score 3) ranks above Thai (score 2)
      expect(result.sourceCuisines[0]).toBe('Mexican');
      expect(result.sourceCuisines).toContain('Thai');
    });

    it('attaches a warm-start-flavored personalizationReason', async () => {
      mockCookingLogFindMany.mockResolvedValueOnce([
        { recipe: { cuisine: 'Thai' } },
      ]);
      mockRecipeFindMany.mockResolvedValueOnce([
        { id: 'r1', title: 'Vietnamese Pho', cuisine: 'Vietnamese' },
      ]);

      const result = await buildNewToYouFeed('user-1', { limit: 4 });

      expect(result.recipes[0].personalizationReason).toMatch(/cooked|Thai/i);
    });
  });

  describe('exclusion of already-explored cuisines', () => {
    it('does not surface recipes from a cuisine the user has already cooked', async () => {
      mockCookingLogFindMany.mockResolvedValueOnce([
        { recipe: { cuisine: 'Thai' } },
        { recipe: { cuisine: 'Vietnamese' } }, // already explored
      ]);
      // The recipe query should pass an exclusion list
      mockRecipeFindMany.mockResolvedValueOnce([]);

      await buildNewToYouFeed('user-1', { limit: 4 });

      // Verify the where clause excludes Thai + Vietnamese
      const queryArgs = mockRecipeFindMany.mock.calls[0]?.[0];
      const cuisineFilter = queryArgs?.where?.cuisine;
      // cuisineFilter should be { in: [...] } or equivalent — must not contain Thai or Vietnamese
      const targetCuisines: string[] = cuisineFilter?.in || [];
      expect(targetCuisines).not.toContain('Thai');
      expect(targetCuisines).not.toContain('Vietnamese');
    });
  });

  describe('limits and shape', () => {
    it('respects the limit parameter', async () => {
      mockCookingLogFindMany.mockResolvedValueOnce([{ recipe: { cuisine: 'Thai' } }]);
      // Return more recipes than the limit
      mockRecipeFindMany.mockResolvedValueOnce([
        { id: 'r1', title: 'A', cuisine: 'Burmese' },
        { id: 'r2', title: 'B', cuisine: 'Vietnamese' },
        { id: 'r3', title: 'C', cuisine: 'Lao' },
        { id: 'r4', title: 'D', cuisine: 'Cambodian' },
        { id: 'r5', title: 'E', cuisine: 'Indonesian' },
      ]);

      const result = await buildNewToYouFeed('user-1', { limit: 3 });

      expect(result.recipes.length).toBeLessThanOrEqual(3);
    });

    it('only fetches non-user-created (system) recipes', async () => {
      mockCookingLogFindMany.mockResolvedValueOnce([{ recipe: { cuisine: 'Thai' } }]);
      mockRecipeFindMany.mockResolvedValueOnce([]);

      await buildNewToYouFeed('user-1', { limit: 4 });

      const queryArgs = mockRecipeFindMany.mock.calls[0]?.[0];
      expect(queryArgs?.where?.isUserCreated).toBe(false);
    });

    it('surfaces a varied set across multiple adjacent cuisines, not all from one', async () => {
      mockCookingLogFindMany.mockResolvedValueOnce([{ recipe: { cuisine: 'Thai' } }]);
      mockRecipeFindMany.mockResolvedValueOnce([
        { id: 'r1', title: 'A', cuisine: 'Burmese' },
        { id: 'r2', title: 'B', cuisine: 'Vietnamese' },
        { id: 'r3', title: 'C', cuisine: 'Lao' },
      ]);

      const result = await buildNewToYouFeed('user-1', { limit: 6 });

      const distinctCuisines = new Set(result.recipes.map((r) => r.cuisine));
      expect(distinctCuisines.size).toBeGreaterThan(1);
    });
  });

  describe('robustness', () => {
    it('handles a user with cooking history but no adjacent cuisines (graceful empty)', async () => {
      mockCookingLogFindMany.mockResolvedValueOnce([
        { recipe: { cuisine: 'NotARealCuisine' } },
      ]);

      const result = await buildNewToYouFeed('user-1', { limit: 4 });

      expect(result.isColdStart).toBe(false);
      expect(result.recipes).toEqual([]);
    });

    it('returns isColdStart=true even when cooking log has entries with null cuisines (skips them)', async () => {
      mockCookingLogFindMany.mockResolvedValueOnce([
        { recipe: { cuisine: null } },
        { recipe: null },
      ]);
      mockUserPrefsFindUnique.mockResolvedValueOnce({ likedCuisines: [{ name: 'Thai' }] });
      mockRecipeFindMany.mockResolvedValueOnce([]);

      const result = await buildNewToYouFeed('user-1', { limit: 4 });

      // Cooking history was effectively empty after filtering nulls → cold start
      expect(result.isColdStart).toBe(true);
    });
  });
});
