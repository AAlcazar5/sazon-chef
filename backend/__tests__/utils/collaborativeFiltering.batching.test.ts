// H5: prove the collaborative-filtering query path is batched, not N+1.
//
// Before this fix:
//   - findSimilarUsers fetched every user, then per candidate ran 4 queries
//     inside calculateUserSimilarity (3 findMany + 1 findFirst).
//   - calculateUserBasedScore looped over similar users and ran 3 findFirsts
//     per candidate to check if THIS recipe was interacted with.
//   - For 200 candidates × 20 similar users this produced ~12k queries per
//     scoring pass.
//
// After: findSimilarUsers issues 4 batched `userId: { in: [...] }` queries
// up front + one capped user findMany. calculateUserBasedScore issues 3
// batched per-recipe queries. Total per call: 8 queries regardless of N.

import { calculateCollaborativeScore } from '../../src/utils/collaborativeFiltering';

// Mock @/lib/prisma so we can count calls. Each fixture returns minimal
// rows that satisfy the algorithm's structural reads.
const calls: { table: string; method: string }[] = [];

function track(table: string, method: string) {
  calls.push({ table, method });
}

const mockPrisma = {
  userPreferences: {
    findFirst: jest.fn(async () => {
      track('userPreferences', 'findFirst');
      return {
        userId: 'me',
        likedCuisines: [{ name: 'italian' }, { name: 'thai' }],
        dietaryRestrictions: [],
      };
    }),
  },
  user: {
    findMany: jest.fn(async () => {
      track('user', 'findMany');
      // 20 candidate users (well under the 500 cap).
      return Array.from({ length: 20 }, (_, i) => ({
        id: `u${i}`,
        preferences: {
          userId: `u${i}`,
          likedCuisines: [{ name: 'italian' }],
          dietaryRestrictions: [],
        },
      }));
    }),
  },
  macroGoals: {
    findFirst: jest.fn(async () => {
      track('macroGoals', 'findFirst');
      return { userId: 'me' };
    }),
    findMany: jest.fn(async () => {
      track('macroGoals', 'findMany');
      return [{ userId: 'u0' }, { userId: 'u1' }, { userId: 'u2' }];
    }),
  },
  recipeFeedback: {
    findMany: jest.fn(async () => {
      track('recipeFeedback', 'findMany');
      // Make a few candidates "look similar" by overlapping with the
      // current user's behavior so >0.3 threshold passes.
      return [
        { userId: 'u0', recipeId: 'r-shared-1' },
        { userId: 'u1', recipeId: 'r-shared-1' },
        { userId: 'u2', recipeId: 'r-shared-2' },
      ];
    }),
    findFirst: jest.fn(async () => {
      track('recipeFeedback', 'findFirst');
      return null;
    }),
  },
  savedRecipe: {
    findMany: jest.fn(async () => {
      track('savedRecipe', 'findMany');
      return [
        { userId: 'u0', recipeId: 'r-shared-1' },
        { userId: 'u3', recipeId: 'r-shared-2' },
      ];
    }),
    findFirst: jest.fn(async () => {
      track('savedRecipe', 'findFirst');
      return null;
    }),
  },
  mealHistory: {
    findMany: jest.fn(async () => {
      track('mealHistory', 'findMany');
      return [{ userId: 'u0', recipeId: 'r-shared-1' }];
    }),
    findFirst: jest.fn(async () => {
      track('mealHistory', 'findFirst');
      return null;
    }),
  },
  recipe: {
    findMany: jest.fn(async () => {
      track('recipe', 'findMany');
      return [];
    }),
  },
};

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('calculateCollaborativeScore — batching (H5)', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('issues O(1) queries regardless of candidate count (no N+1)', async () => {
    const recipe = { id: 'target-recipe' };
    const userBehavior = {
      likedRecipes: [
        {
          recipeId: 'r-shared-1',
          cuisine: 'italian',
          cookTime: 30,
          calories: 500,
          protein: 30,
          carbs: 40,
          fat: 20,
          ingredients: [],
          createdAt: new Date(),
        },
      ],
      dislikedRecipes: [],
      savedRecipes: [],
      consumedRecipes: [],
    };

    await calculateCollaborativeScore(recipe, 'me', userBehavior as any);

    // Hard upper bound on total DB calls. With 20 candidates the pre-H5
    // path would have made: 1 (current prefs) + 1 (allUsers) + 20 × 4
    // (per-candidate similarity queries) + 20 × 3 (per-similar-user
    // recipe checks in calculateUserBasedScore) = ~142 calls. We
    // expect ≤ 12 now: prefs + allUsers + 4 batched (similarity) + 1
    // currentMacro + 3 batched (per-recipe checks) + 1 itemBased recipe
    // findMany.
    expect(calls.length).toBeLessThanOrEqual(12);

    // Sanity: zero findFirst calls inside the per-similar-user loop.
    // findFirst is allowed for `currentUserPrefs` lookup only.
    const findFirstCalls = calls.filter((c) => c.method === 'findFirst');
    const allowedFindFirst = new Set(['userPreferences', 'macroGoals']);
    for (const call of findFirstCalls) {
      expect(allowedFindFirst.has(call.table)).toBe(true);
    }
  });

  it('uses batched `findMany` (not `findFirst` in a loop) for per-similar-user recipe-interaction checks', async () => {
    calls.length = 0;
    const recipe = { id: 'target-recipe' };
    const userBehavior = {
      likedRecipes: [
        {
          recipeId: 'r-shared-1',
          cuisine: 'italian',
          cookTime: 30,
          calories: 500,
          protein: 30,
          carbs: 40,
          fat: 20,
          ingredients: [],
          createdAt: new Date(),
        },
      ],
      dislikedRecipes: [],
      savedRecipes: [],
      consumedRecipes: [],
    };

    await calculateCollaborativeScore(recipe, 'me', userBehavior as any);

    // The N×3 findFirst pattern is gone. recipeFeedback / savedRecipe /
    // mealHistory should ONLY be called via findMany (batched in/where).
    expect(mockPrisma.recipeFeedback.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.savedRecipe.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.mealHistory.findFirst).not.toHaveBeenCalled();
  });
});
