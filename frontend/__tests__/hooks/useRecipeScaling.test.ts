// frontend/__tests__/hooks/useRecipeScaling.test.ts
// TDD — RED phase: tests written before implementation.

import { renderHook, act } from '@testing-library/react-native';
import { useRecipeScaling } from '../../hooks/useRecipeScaling';

// Minimal recipe fixture
function makeRecipe(id: string, ingredients: string[]) {
  return {
    id,
    title: 'Test Recipe',
    description: '',
    cookTime: 30,
    cuisine: 'American',
    calories: 400,
    protein: 30,
    carbs: 40,
    fat: 15,
    ingredients,
    instructions: [],
  };
}

describe('useRecipeScaling', () => {
  describe('initial state', () => {
    it('returns empty servingsByRecipe on init', () => {
      const { result } = renderHook(() => useRecipeScaling());
      expect(result.current.servingsByRecipe).toEqual({});
    });
  });

  describe('setServings', () => {
    it('sets servings for a recipe id', () => {
      const { result } = renderHook(() => useRecipeScaling());
      act(() => {
        result.current.setServings('r1', 2);
      });
      expect(result.current.servingsByRecipe['r1']).toBe(2);
    });

    it('overwrites existing servings for same id', () => {
      const { result } = renderHook(() => useRecipeScaling());
      act(() => {
        result.current.setServings('r1', 2);
        result.current.setServings('r1', 3);
      });
      expect(result.current.servingsByRecipe['r1']).toBe(3);
    });

    it('handles multiple recipe ids independently', () => {
      const { result } = renderHook(() => useRecipeScaling());
      act(() => {
        result.current.setServings('r1', 2);
        result.current.setServings('r2', 3);
      });
      expect(result.current.servingsByRecipe['r1']).toBe(2);
      expect(result.current.servingsByRecipe['r2']).toBe(3);
    });

    it('does not mutate the previous state object', () => {
      const { result } = renderHook(() => useRecipeScaling());
      act(() => { result.current.setServings('r1', 1); });
      const first = result.current.servingsByRecipe;
      act(() => { result.current.setServings('r2', 2); });
      expect(result.current.servingsByRecipe).not.toBe(first);
    });
  });

  describe('getScaledIngredients — 2x multiplier', () => {
    it('doubles an integer amount', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['2 cups flour']);
      const scaled = result.current.getScaledIngredients(recipe, 2);
      expect(scaled[0]).toBe('4 cups flour');
    });

    it('doubles a decimal amount', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['1.5 cups oats']);
      const scaled = result.current.getScaledIngredients(recipe, 2);
      expect(scaled[0]).toBe('3 cups oats');
    });

    it('doubles a fractional amount (1/2)', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['1/2 tsp salt']);
      const scaled = result.current.getScaledIngredients(recipe, 2);
      expect(scaled[0]).toBe('1 tsp salt');
    });

    it('doubles a mixed number (1 1/2)', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['1 1/2 cups milk']);
      const scaled = result.current.getScaledIngredients(recipe, 2);
      expect(scaled[0]).toBe('3 cups milk');
    });
  });

  describe('getScaledIngredients — 1.5x multiplier', () => {
    it('handles 1.5x on an integer', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['2 eggs']);
      const scaled = result.current.getScaledIngredients(recipe, 1.5);
      expect(scaled[0]).toBe('3 eggs');
    });

    it('handles 1.5x on a mixed number (1 1/2)', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['1 1/2 cups oats']);
      const scaled = result.current.getScaledIngredients(recipe, 1.5);
      // 1.5 * 1.5 = 2.25
      expect(scaled[0]).toMatch(/^2\.25 cups oats|^2¼ cups oats/);
    });
  });

  describe('getScaledIngredients — passthrough cases', () => {
    it('passes through "to taste" unchanged', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['Salt to taste']);
      const scaled = result.current.getScaledIngredients(recipe, 2);
      expect(scaled[0]).toBe('Salt to taste');
    });

    it('passes through "as needed" unchanged', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['Olive oil as needed']);
      const scaled = result.current.getScaledIngredients(recipe, 3);
      expect(scaled[0]).toBe('Olive oil as needed');
    });

    it('passes through pure text with no leading number unchanged', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['Pinch of black pepper']);
      const scaled = result.current.getScaledIngredients(recipe, 2);
      expect(scaled[0]).toBe('Pinch of black pepper');
    });

    it('scales a 1x multiplier to identical output', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['3 cloves garlic']);
      const scaled = result.current.getScaledIngredients(recipe, 1);
      expect(scaled[0]).toBe('3 cloves garlic');
    });
  });

  describe('getScaledIngredients — object ingredient format', () => {
    it('scales object-format ingredients { id, text, order }', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = {
        id: 'r1',
        title: 'Test',
        description: '',
        cookTime: 20,
        cuisine: 'Italian',
        calories: 300,
        protein: 20,
        carbs: 30,
        fat: 10,
        ingredients: [
          { id: 'ing1', text: '2 cups pasta', order: 1 },
          { id: 'ing2', text: 'Salt to taste', order: 2 },
        ],
        instructions: [],
      };
      const scaled = result.current.getScaledIngredients(recipe as any, 2);
      expect(scaled[0]).toBe('4 cups pasta');
      expect(scaled[1]).toBe('Salt to taste');
    });
  });

  describe('getScaledIngredients — edge cases', () => {
    it('handles empty ingredients array', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', []);
      const scaled = result.current.getScaledIngredients(recipe, 2);
      expect(scaled).toEqual([]);
    });

    it('handles multiplier of 0 by returning 0 amounts', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['4 cups broth']);
      const scaled = result.current.getScaledIngredients(recipe, 0);
      expect(scaled[0]).toMatch(/^0/);
    });

    it('handles ingredient with only a number (no unit/name)', () => {
      const { result } = renderHook(() => useRecipeScaling());
      const recipe = makeRecipe('r1', ['3']);
      const scaled = result.current.getScaledIngredients(recipe, 2);
      expect(scaled[0]).toBe('6');
    });
  });
});
