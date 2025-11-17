import {
  generateStorageInstructions,
  getStorageMethods,
} from '../../utils/storageInstructions';
import type { Recipe } from '../../types';

describe('Storage Instructions', () => {
  describe('getStorageMethods', () => {
    test('should return freezer method for freezable recipe', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        freezable: true,
      };

      const methods = getStorageMethods(recipe);
      expect(methods).toContain('freezer');
    });

    test('should return fridge method for weekly prep recipe', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        weeklyPrepFriendly: true,
        fridgeStorageDays: 5,
      };

      const methods = getStorageMethods(recipe);
      expect(methods).toContain('fridge');
    });

    test('should return shelf method for shelf-stable recipe', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        shelfStable: true,
      };

      const methods = getStorageMethods(recipe);
      expect(methods).toContain('shelf');
    });

    test('should return multiple methods when applicable', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        freezable: true,
        weeklyPrepFriendly: true,
        shelfStable: true,
      };

      const methods = getStorageMethods(recipe);
      expect(methods.length).toBeGreaterThan(1);
      expect(methods).toContain('freezer');
      expect(methods).toContain('fridge');
      expect(methods).toContain('shelf');
    });

    test('should return empty array for recipe without storage info', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
      };

      const methods = getStorageMethods(recipe);
      expect(methods).toEqual([]);
    });

    test('should detect freezer from freezerStorageMonths', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        freezerStorageMonths: 3,
      };

      const methods = getStorageMethods(recipe);
      expect(methods).toContain('freezer');
    });

    test('should detect fridge from fridgeStorageDays', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        fridgeStorageDays: 5,
      };

      const methods = getStorageMethods(recipe);
      expect(methods).toContain('fridge');
    });
  });

  describe('generateStorageInstructions', () => {
    test('should generate instructions for freezable recipe', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        freezable: true,
        freezerStorageMonths: 3,
      };

      const instructions = generateStorageInstructions(recipe);
      expect(instructions).toBeDefined();
      expect(instructions.instructions).toBeDefined();
      expect(instructions.instructions.length).toBeGreaterThan(0);
      expect(instructions.instructions.toLowerCase()).toContain('freeze');
    });

    test('should generate instructions for fridge storage', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        fridgeStorageDays: 5,
      };

      const instructions = generateStorageInstructions(recipe);
      expect(instructions.instructions).toContain('5');
      expect(instructions.instructions.toLowerCase()).toContain('refrigerat');
    });

    test('should use custom storage instructions if provided', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        storageInstructions: 'Store in airtight container for up to 7 days',
      };

      const instructions = generateStorageInstructions(recipe);
      expect(instructions.instructions).toBe('Store in airtight container for up to 7 days');
    });

    test('should handle recipe with no storage info', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
      };

      const instructions = generateStorageInstructions(recipe);
      expect(instructions).toBeDefined();
    });
  });
});

