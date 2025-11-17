import { scaleRecipe, ScaledRecipe } from '../../utils/recipeScaling';

describe('Recipe Scaling', () => {
  const mockRecipe = {
    servings: 4,
    ingredients: [
      '2 cups flour',
      '1 cup milk',
      '3 eggs',
      '1 teaspoon salt',
      '2 tablespoons butter',
    ],
    calories: 400,
    protein: 20,
    carbs: 50,
    fat: 15,
    fiber: 5,
    sugar: 10,
  };

  describe('scaleRecipe', () => {
    test('should scale recipe to double servings', () => {
      const scaled = scaleRecipe(mockRecipe, 8);

      expect(scaled.servings).toBe(8);
      expect(scaled.calories).toBe(800);
      expect(scaled.protein).toBe(40);
      expect(scaled.carbs).toBe(100);
      expect(scaled.fat).toBe(30);
      expect(scaled.fiber).toBe(10);
      expect(scaled.sugar).toBe(20);
    });

    test('should scale recipe to triple servings', () => {
      const scaled = scaleRecipe(mockRecipe, 12);

      expect(scaled.servings).toBe(12);
      expect(scaled.calories).toBe(1200);
      expect(scaled.protein).toBe(60);
    });

    test('should scale ingredients correctly', () => {
      const scaled = scaleRecipe(mockRecipe, 8);

      expect(scaled.ingredients.length).toBe(mockRecipe.ingredients.length);
      
      // Check that ingredients are scaled
      const flourIngredient = scaled.ingredients.find(ing => 
        ing.ingredientName.toLowerCase().includes('flour')
      );
      expect(flourIngredient).toBeDefined();
      expect(flourIngredient!.scaledAmount).toBe(4); // 2 cups * 2
    });

    test('should handle fractional scaling', () => {
      const scaled = scaleRecipe(mockRecipe, 6); // 1.5x

      expect(scaled.servings).toBe(6);
      expect(scaled.calories).toBe(600);
      
      // Check fractional ingredient scaling
      const milkIngredient = scaled.ingredients.find(ing => 
        ing.ingredientName.toLowerCase().includes('milk')
      );
      expect(milkIngredient).toBeDefined();
      expect(milkIngredient!.scaledAmount).toBe(1.5); // 1 cup * 1.5
    });

    test('should handle recipe with default servings (1)', () => {
      const singleServingRecipe = {
        ...mockRecipe,
        servings: undefined,
      };

      const scaled = scaleRecipe(singleServingRecipe, 4);

      expect(scaled.servings).toBe(4);
      expect(scaled.calories).toBe(1600); // 400 * 4
    });

    test('should handle ingredients without quantities', () => {
      const recipeWithUnparsable = {
        ...mockRecipe,
        ingredients: [
          'Salt to taste',
          '2 cups flour',
          'A pinch of pepper',
        ],
      };

      const scaled = scaleRecipe(recipeWithUnparsable, 8);

      expect(scaled.ingredients.length).toBe(3);
      // Unparsable ingredients should still be included
      const saltIngredient = scaled.ingredients.find(ing => 
        ing.ingredientName.toLowerCase().includes('salt')
      );
      expect(saltIngredient).toBeDefined();
    });

    test('should handle mixed fraction ingredients', () => {
      const recipeWithFractions = {
        ...mockRecipe,
        ingredients: [
          '2 1/2 cups flour',
          '1/2 cup sugar',
          '3 3/4 teaspoons vanilla',
        ],
      };

      const scaled = scaleRecipe(recipeWithFractions, 8); // 2x

      const flourIngredient = scaled.ingredients.find(ing => 
        ing.ingredientName.toLowerCase().includes('flour')
      );
      expect(flourIngredient!.scaledAmount).toBe(5); // 2.5 * 2

      const sugarIngredient = scaled.ingredients.find(ing => 
        ing.ingredientName.toLowerCase().includes('sugar')
      );
      expect(sugarIngredient!.scaledAmount).toBe(1); // 0.5 * 2
    });

    test('should handle ingredients array with objects', () => {
      const recipeWithObjects = {
        ...mockRecipe,
        ingredients: [
          { text: '2 cups flour' },
          { text: '1 cup milk' },
        ],
      };

      const scaled = scaleRecipe(recipeWithObjects, 8);

      expect(scaled.ingredients.length).toBe(2);
      expect(scaled.ingredients[0].originalText).toBe('2 cups flour');
    });

    test('should round macro values', () => {
      const scaled = scaleRecipe(mockRecipe, 3); // 0.75x

      // Should round to nearest integer
      expect(Number.isInteger(scaled.calories)).toBe(true);
      expect(Number.isInteger(scaled.protein)).toBe(true);
    });

    test('should handle zero servings edge case', () => {
      const scaled = scaleRecipe(mockRecipe, 0);

      expect(scaled.servings).toBe(0);
      expect(scaled.calories).toBe(0);
      expect(scaled.ingredients.length).toBe(mockRecipe.ingredients.length);
    });

    test('should handle very large scaling', () => {
      const scaled = scaleRecipe(mockRecipe, 100); // 25x

      expect(scaled.servings).toBe(100);
      expect(scaled.calories).toBe(10000); // 400 * 25
      
      const flourIngredient = scaled.ingredients.find(ing => 
        ing.ingredientName.toLowerCase().includes('flour')
      );
      expect(flourIngredient!.scaledAmount).toBe(50); // 2 * 25
    });

    test('should preserve ingredient structure', () => {
      const scaled = scaleRecipe(mockRecipe, 8);

      scaled.ingredients.forEach((ing, index) => {
        expect(ing).toHaveProperty('originalText');
        expect(ing).toHaveProperty('scaledText');
        expect(ing).toHaveProperty('originalAmount');
        expect(ing).toHaveProperty('scaledAmount');
        expect(ing).toHaveProperty('unit');
        expect(ing).toHaveProperty('ingredientName');
      });
    });
  });
});

