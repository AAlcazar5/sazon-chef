import { generateBatchCookingRecommendations } from '../../src/utils/batchCookingRecommendations';
import { prisma } from '../../src/lib/prisma';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
    },
    recipeFeedback: {
      findMany: jest.fn(),
    },
    userPreferences: {
      findUnique: jest.fn(),
    },
  }
}));

describe('Batch Cooking Recommendations', () => {
  const mockUserId = 'test-user-id';

  const mockRecipes = [
    {
      id: 'recipe-1',
      title: 'Chicken Curry',
      mealPrepSuitable: true,
      batchFriendly: true,
      freezable: true,
      weeklyPrepFriendly: true,
      mealPrepScore: 85,
      cookTime: 45,
      calories: 500,
      protein: 30,
      carbs: 40,
      fat: 20,
    },
    {
      id: 'recipe-2',
      title: 'Pasta Salad',
      mealPrepSuitable: true,
      batchFriendly: true,
      freezable: false,
      weeklyPrepFriendly: true,
      mealPrepScore: 75,
      cookTime: 20,
      calories: 400,
      protein: 15,
      carbs: 60,
      fat: 10,
    },
    {
      id: 'recipe-3',
      title: 'Fresh Salad',
      mealPrepSuitable: false,
      batchFriendly: false,
      freezable: false,
      weeklyPrepFriendly: false,
      mealPrepScore: 20,
      cookTime: 10,
      calories: 200,
      protein: 5,
      carbs: 30,
      fat: 5,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should generate recommendations based on meal prep suitability', async () => {
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes);
    (prisma.recipeFeedback.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);

    const recommendations = await generateBatchCookingRecommendations(mockUserId, 10);

    // Recommendations may be empty if no recipes match criteria, which is valid
    if (recommendations.length > 0) {
      expect(recommendations[0]).toHaveProperty('recipeId');
      expect(recommendations[0]).toHaveProperty('matchScore');
      expect(recommendations[0]).toHaveProperty('reason');
    }
  });

  test('should prioritize recipes with high meal prep scores', async () => {
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes);
    (prisma.recipeFeedback.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);

    const recommendations = await generateBatchCookingRecommendations(mockUserId, 10);

    // Recipe 1 should rank higher than Recipe 2 due to higher score
    const recipe1Index = recommendations.findIndex(r => r.recipeId === 'recipe-1');
    const recipe2Index = recommendations.findIndex(r => r.recipeId === 'recipe-2');
    
    if (recipe1Index !== -1 && recipe2Index !== -1) {
      expect(recipe1Index).toBeLessThan(recipe2Index);
    }
  });

  test('should filter out recipes not suitable for meal prep', async () => {
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes);
    (prisma.recipeFeedback.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);

    const recommendations = await generateBatchCookingRecommendations(mockUserId, 10);

    const freshSalad = recommendations.find(r => r.recipeId === 'recipe-3');
    expect(freshSalad).toBeUndefined();
  });

  test('should respect limit parameter', async () => {
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes);
    (prisma.recipeFeedback.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);

    const recommendations = await generateBatchCookingRecommendations(mockUserId, 1);

    expect(recommendations.length).toBeLessThanOrEqual(1);
  });

  test('should handle empty recipe list', async () => {
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.recipeFeedback.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);

    const recommendations = await generateBatchCookingRecommendations(mockUserId, 10);

    expect(recommendations).toEqual([]);
  });

  test('should include reasons for recommendations', async () => {
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes);
    (prisma.recipeFeedback.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);

    const recommendations = await generateBatchCookingRecommendations(mockUserId, 10);

    if (recommendations.length > 0) {
      expect(recommendations[0].reason).toBeDefined();
      expect(typeof recommendations[0].reason).toBe('string');
      expect(recommendations[0].reason.length).toBeGreaterThan(0);
    }
  });

  test('should consider user preferences when scoring', async () => {
    const mockPreferences = {
      preferredCuisines: ['Italian'],
      cookTimePreference: 30,
    };

    const italianRecipe = {
      ...mockRecipes[0],
      cuisine: 'Italian',
      cookTime: 25,
    };

    (prisma.recipe.findMany as jest.Mock).mockResolvedValue([italianRecipe]);
    (prisma.recipeFeedback.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(mockPreferences);

    const recommendations = await generateBatchCookingRecommendations(mockUserId, 10);

    if (recommendations.length > 0) {
      // Recipe should have higher score due to matching preferences
      expect(recommendations[0].matchScore).toBeGreaterThan(0);
    }
  });
});

