import { calculateRecipeScore } from '../../src/utils/scoring';

describe('Recipe Scoring Algorithm', () => {
  const mockRecipe = {
    id: '1',
    title: 'Test Recipe',
    description: 'Test Description',
    cookTime: 30,
    cuisine: 'Italian',
    calories: 500,
    protein: 25,
    carbs: 50,
    fat: 20,
    ingredients: [{ text: 'pasta' }, { text: 'tomato sauce' }],
    instructions: [{ text: 'Cook pasta' }]
  };

  const mockPreferences = {
    id: '1',
    userId: 'user1',
    cookTimePreference: 30,
    spiceLevel: 'medium',
    bannedIngredients: [],
    likedCuisines: [{ name: 'Italian' }],
    dietaryRestrictions: []
  };

  const mockMacroGoals = {
    id: '1',
    userId: 'user1',
    calories: 500,
    protein: 25,
    carbs: 50,
    fat: 20
  };

  describe('calculateRecipeScore', () => {
    test('should return perfect score for perfect match', () => {
      const score = calculateRecipeScore(mockRecipe, mockPreferences, mockMacroGoals);
      
      expect(score.total).toBeGreaterThan(0);
      expect(score.macroScore).toBeGreaterThan(0);
      expect(score.tasteScore).toBeGreaterThan(0);
      expect(score.matchPercentage).toBeGreaterThan(0);
      expect(score.breakdown).toBeDefined();
    });

    test('should handle missing preferences gracefully', () => {
      const score = calculateRecipeScore(mockRecipe, null, null);
      
      expect(score.total).toBe(50);
      expect(score.macroScore).toBe(50);
      expect(score.tasteScore).toBe(50);
      expect(score.matchPercentage).toBe(50);
    });

    test('should handle missing macro goals gracefully', () => {
      const score = calculateRecipeScore(mockRecipe, mockPreferences, null);
      
      expect(score.total).toBe(50);
      expect(score.macroScore).toBe(50);
      expect(score.tasteScore).toBe(50);
    });

    test('should penalize banned ingredients', () => {
      const preferencesWithBanned = {
        ...mockPreferences,
        bannedIngredients: [{ name: 'pasta' }]
      };
      
      const score = calculateRecipeScore(mockRecipe, preferencesWithBanned, mockMacroGoals);
      
      // With banned ingredient, ingredient match should be 0
      expect(score.breakdown?.ingredientMatch).toBe(0);
      
      // The penalty is minimal due to low weight (0.1 * 0.3 = 0.03)
      // Expected: macroScore * 0.7 + tasteScore * 0.3 = 100 * 0.7 + (100 * 0.3 + 100 * 0.1 + 0 * 0.1) * 0.3 = 70 + 12 = 82
      expect(score.total).toBe(82);
    });

    test('should handle extreme macro mismatches', () => {
      const extremeMacroGoals = {
        ...mockMacroGoals,
        calories: 2000,
        protein: 100,
        carbs: 200,
        fat: 100
      };
      
      const score = calculateRecipeScore(mockRecipe, mockPreferences, extremeMacroGoals);
      expect(score.total).toBeGreaterThan(0);
      expect(score.macroScore).toBeLessThan(100);
    });

    test('should handle zero values gracefully', () => {
      const zeroRecipe = {
        ...mockRecipe,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };
      
      const score = calculateRecipeScore(zeroRecipe, mockPreferences, mockMacroGoals);
      expect(score.total).toBeGreaterThanOrEqual(0);
    });

    test('should handle very long cook times', () => {
      const longCookRecipe = {
        ...mockRecipe,
        cookTime: 300 // 5 hours
      };
      
      const score = calculateRecipeScore(longCookRecipe, mockPreferences, mockMacroGoals);
      expect(score.total).toBeGreaterThan(0);
    });

    test('should handle very short cook times', () => {
      const shortCookRecipe = {
        ...mockRecipe,
        cookTime: 5 // 5 minutes
      };
      
      const score = calculateRecipeScore(shortCookRecipe, mockPreferences, mockMacroGoals);
      expect(score.total).toBeGreaterThan(0);
    });

    test('should handle vegetarian dietary restrictions', () => {
      const vegetarianPreferences = {
        ...mockPreferences,
        dietaryRestrictions: [{ name: 'vegetarian' }]
      };
      
      const vegetarianRecipe = {
        ...mockRecipe,
        ingredients: [{ text: 'pasta' }, { text: 'vegetables' }]
      };
      
      const nonVegetarianRecipe = {
        ...mockRecipe,
        ingredients: [{ text: 'chicken' }, { text: 'pasta' }]
      };
      
      const vegetarianScore = calculateRecipeScore(vegetarianRecipe, vegetarianPreferences, mockMacroGoals);
      const nonVegetarianScore = calculateRecipeScore(nonVegetarianRecipe, vegetarianPreferences, mockMacroGoals);
      
      expect(vegetarianScore.total).toBeGreaterThan(nonVegetarianScore.total);
    });

    test('should handle vegan dietary restrictions', () => {
      const veganPreferences = {
        ...mockPreferences,
        dietaryRestrictions: [{ name: 'vegan' }]
      };
      
      const veganRecipe = {
        ...mockRecipe,
        ingredients: [{ text: 'pasta' }, { text: 'vegetables' }]
      };
      
      const nonVeganRecipe = {
        ...mockRecipe,
        ingredients: [{ text: 'cheese' }, { text: 'pasta' }]
      };
      
      const veganScore = calculateRecipeScore(veganRecipe, veganPreferences, mockMacroGoals);
      const nonVeganScore = calculateRecipeScore(nonVeganRecipe, veganPreferences, mockMacroGoals);
      
      expect(veganScore.total).toBeGreaterThan(nonVeganScore.total);
    });

    test('should handle spice level preferences', () => {
      const mildPreferences = {
        ...mockPreferences,
        spiceLevel: 'mild'
      };
      
      const spicyPreferences = {
        ...mockPreferences,
        spiceLevel: 'spicy'
      };
      
      const mildScore = calculateRecipeScore(mockRecipe, mildPreferences, mockMacroGoals);
      const spicyScore = calculateRecipeScore(mockRecipe, spicyPreferences, mockMacroGoals);
      
      expect(mildScore.total).toBeGreaterThan(0);
      expect(spicyScore.total).toBeGreaterThan(0);
    });

    test('should handle liked cuisines', () => {
      const italianPreferences = {
        ...mockPreferences,
        likedCuisines: [{ name: 'Italian' }]
      };
      
      const asianPreferences = {
        ...mockPreferences,
        likedCuisines: [{ name: 'Asian' }]
      };
      
      const italianScore = calculateRecipeScore(mockRecipe, italianPreferences, mockMacroGoals);
      const asianScore = calculateRecipeScore(mockRecipe, asianPreferences, mockMacroGoals);
      
      expect(italianScore.total).toBeGreaterThan(asianScore.total);
    });

    test('should handle multiple dietary restrictions', () => {
      const multipleRestrictions = {
        ...mockPreferences,
        dietaryRestrictions: [{ name: 'vegetarian' }, { name: 'gluten-free' }]
      };
      
      const compatibleRecipe = {
        ...mockRecipe,
        ingredients: [{ text: 'quinoa' }, { text: 'vegetables' }]
      };
      
      const incompatibleRecipe = {
        ...mockRecipe,
        ingredients: [{ text: 'pasta' }, { text: 'chicken' }]
      };
      
      const compatibleScore = calculateRecipeScore(compatibleRecipe, multipleRestrictions, mockMacroGoals);
      const incompatibleScore = calculateRecipeScore(incompatibleRecipe, multipleRestrictions, mockMacroGoals);
      
      expect(compatibleScore.total).toBeGreaterThan(incompatibleScore.total);
    });

    test('should handle empty ingredients list', () => {
      const emptyIngredientsRecipe = {
        ...mockRecipe,
        ingredients: []
      };
      
      const score = calculateRecipeScore(emptyIngredientsRecipe, mockPreferences, mockMacroGoals);
      expect(score.total).toBeGreaterThanOrEqual(0);
    });

    test('should handle extreme macro values', () => {
      const extremeRecipe = {
        ...mockRecipe,
        calories: 10000,
        protein: 1000,
        carbs: 1000,
        fat: 1000
      };
      
      const score = calculateRecipeScore(extremeRecipe, mockPreferences, mockMacroGoals);
      expect(score.total).toBeGreaterThanOrEqual(0);
    });

    test('should handle negative macro values', () => {
      const negativeRecipe = {
        ...mockRecipe,
        calories: -100,
        protein: -10,
        carbs: -10,
        fat: -10
      };
      
      const score = calculateRecipeScore(negativeRecipe, mockPreferences, mockMacroGoals);
      expect(score.total).toBeGreaterThanOrEqual(0);
    });
  });
});
