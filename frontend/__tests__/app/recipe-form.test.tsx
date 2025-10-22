import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import RecipeFormScreen from '../../app/recipe-form';
import { recipeApi } from '../../lib/api';

// Mock the API
jest.mock('../../lib/api', () => ({
  recipeApi: {
    createRecipe: jest.fn(),
    updateRecipe: jest.fn(),
    getRecipe: jest.fn()
  }
}));

// Mock Alert
const mockAlert = jest.fn();
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: mockAlert
    }
  };
});

describe('RecipeFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
  });

  test('should render form with default values', () => {
    render(<RecipeFormScreen />);
    
    expect(screen.getByText('Create Recipe')).toBeTruthy();
    expect(screen.getByPlaceholderText('Recipe title')).toBeTruthy();
    expect(screen.getByPlaceholderText('Recipe description')).toBeTruthy();
  });

  test('should validate required fields', async () => {
    render(<RecipeFormScreen />);
    
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please fill in all required fields');
    });
  });

  test('should validate title field', async () => {
    render(<RecipeFormScreen />);
    
    const titleInput = screen.getByPlaceholderText('Recipe title');
    fireEvent.changeText(titleInput, '');
    
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please fill in all required fields');
    });
  });

  test('should validate description field', async () => {
    render(<RecipeFormScreen />);
    
    const titleInput = screen.getByPlaceholderText('Recipe title');
    fireEvent.changeText(titleInput, 'Test Recipe');
    
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please fill in all required fields');
    });
  });

  test('should validate cook time field', async () => {
    render(<RecipeFormScreen />);
    
    const titleInput = screen.getByPlaceholderText('Recipe title');
    fireEvent.changeText(titleInput, 'Test Recipe');
    
    const descriptionInput = screen.getByPlaceholderText('Recipe description');
    fireEvent.changeText(descriptionInput, 'Test Description');
    
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please fill in all required fields');
    });
  });

  test('should validate cuisine field', async () => {
    render(<RecipeFormScreen />);
    
    const titleInput = screen.getByPlaceholderText('Recipe title');
    fireEvent.changeText(titleInput, 'Test Recipe');
    
    const descriptionInput = screen.getByPlaceholderText('Recipe description');
    fireEvent.changeText(descriptionInput, 'Test Description');
    
    const cookTimeInput = screen.getByPlaceholderText('30');
    fireEvent.changeText(cookTimeInput, '30');
    
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please fill in all required fields');
    });
  });

  test('should validate macro nutrients', async () => {
    render(<RecipeFormScreen />);
    
    // Fill required fields
    fireEvent.changeText(screen.getByPlaceholderText('Recipe title'), 'Test Recipe');
    fireEvent.changeText(screen.getByPlaceholderText('Recipe description'), 'Test Description');
    fireEvent.changeText(screen.getByPlaceholderText('30'), '30');
    fireEvent.changeText(screen.getByPlaceholderText('Italian'), 'Italian');
    
    // Add ingredients and instructions
    fireEvent.press(screen.getByText('Add Ingredient'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., 2 cups flour'), 'Test ingredient');
    
    fireEvent.press(screen.getByText('Add Step'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., Preheat oven to 350°F'), 'Test step');
    
    // Try to save without macro nutrients
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please fill in all macro nutrients');
    });
  });

  test('should add and remove ingredients', () => {
    render(<RecipeFormScreen />);
    
    const addButton = screen.getByText('Add Ingredient');
    fireEvent.press(addButton);
    
    const ingredientInput = screen.getByPlaceholderText('e.g., 2 cups flour');
    fireEvent.changeText(ingredientInput, 'Test ingredient');
    
    expect(screen.getByText('Test ingredient')).toBeTruthy();
    
    const removeButton = screen.getByText('Remove');
    fireEvent.press(removeButton);
    
    expect(screen.queryByText('Test ingredient')).toBeFalsy();
  });

  test('should add and remove instructions', () => {
    render(<RecipeFormScreen />);
    
    const addButton = screen.getByText('Add Step');
    fireEvent.press(addButton);
    
    const instructionInput = screen.getByPlaceholderText('e.g., Preheat oven to 350°F');
    fireEvent.changeText(instructionInput, 'Test step');
    
    expect(screen.getByText('Test step')).toBeTruthy();
    
    const removeButton = screen.getByText('Remove');
    fireEvent.press(removeButton);
    
    expect(screen.queryByText('Test step')).toBeFalsy();
  });

  test('should validate cook time range', async () => {
    render(<RecipeFormScreen />);
    
    const titleInput = screen.getByPlaceholderText('Recipe title');
    fireEvent.changeText(titleInput, 'Test Recipe');
    
    const descriptionInput = screen.getByPlaceholderText('Recipe description');
    fireEvent.changeText(descriptionInput, 'Test Description');
    
    const cookTimeInput = screen.getByPlaceholderText('30');
    fireEvent.changeText(cookTimeInput, '500'); // Too long
    
    const cuisineInput = screen.getByPlaceholderText('Italian');
    fireEvent.changeText(cuisineInput, 'Italian');
    
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Cook time must be between 5 and 300 minutes');
    });
  });

  test('should validate cook time minimum', async () => {
    render(<RecipeFormScreen />);
    
    const titleInput = screen.getByPlaceholderText('Recipe title');
    fireEvent.changeText(titleInput, 'Test Recipe');
    
    const descriptionInput = screen.getByPlaceholderText('Recipe description');
    fireEvent.changeText(descriptionInput, 'Test Description');
    
    const cookTimeInput = screen.getByPlaceholderText('30');
    fireEvent.changeText(cookTimeInput, '2'); // Too short
    
    const cuisineInput = screen.getByPlaceholderText('Italian');
    fireEvent.changeText(cuisineInput, 'Italian');
    
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Cook time must be between 5 and 300 minutes');
    });
  });

  test('should create recipe with valid data', async () => {
    const mockRecipe = {
      id: 'recipe-1',
      title: 'Test Recipe',
      description: 'Test Description',
      cookTime: 30,
      cuisine: 'Italian',
      calories: 500,
      protein: 25,
      carbs: 50,
      fat: 20
    };

    (recipeApi.createRecipe as jest.Mock).mockResolvedValue({
      data: { recipe: mockRecipe }
    });

    render(<RecipeFormScreen />);
    
    // Fill in all required fields
    fireEvent.changeText(screen.getByPlaceholderText('Recipe title'), 'Test Recipe');
    fireEvent.changeText(screen.getByPlaceholderText('Recipe description'), 'Test Description');
    fireEvent.changeText(screen.getByPlaceholderText('30'), '30');
    fireEvent.changeText(screen.getByPlaceholderText('Italian'), 'Italian');
    
    // Add ingredients
    fireEvent.press(screen.getByText('Add Ingredient'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., 2 cups flour'), 'Test ingredient');
    
    // Add instructions
    fireEvent.press(screen.getByText('Add Step'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., Preheat oven to 350°F'), 'Test step');
    
    // Fill macro nutrients
    fireEvent.changeText(screen.getByPlaceholderText('500'), '500');
    fireEvent.changeText(screen.getByPlaceholderText('25'), '25');
    fireEvent.changeText(screen.getByPlaceholderText('50'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('20'), '20');
    
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(recipeApi.createRecipe).toHaveBeenCalledWith({
        title: 'Test Recipe',
        description: 'Test Description',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 500,
        protein: 25,
        carbs: 50,
        fat: 20,
        ingredients: ['Test ingredient'],
        instructions: ['Test step']
      });
    });
  });

  test('should handle API errors gracefully', async () => {
    (recipeApi.createRecipe as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<RecipeFormScreen />);
    
    // Fill in all required fields
    fireEvent.changeText(screen.getByPlaceholderText('Recipe title'), 'Test Recipe');
    fireEvent.changeText(screen.getByPlaceholderText('Recipe description'), 'Test Description');
    fireEvent.changeText(screen.getByPlaceholderText('30'), '30');
    fireEvent.changeText(screen.getByPlaceholderText('Italian'), 'Italian');
    
    // Add ingredients
    fireEvent.press(screen.getByText('Add Ingredient'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., 2 cups flour'), 'Test ingredient');
    
    // Add instructions
    fireEvent.press(screen.getByText('Add Step'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., Preheat oven to 350°F'), 'Test step');
    
    // Fill macro nutrients
    fireEvent.changeText(screen.getByPlaceholderText('500'), '500');
    fireEvent.changeText(screen.getByPlaceholderText('25'), '25');
    fireEvent.changeText(screen.getByPlaceholderText('50'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('20'), '20');
    
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Network error');
    });
  });

  test('should handle optional fields', async () => {
    const mockRecipe = {
      id: 'recipe-1',
      title: 'Test Recipe',
      description: 'Test Description',
      cookTime: 30,
      cuisine: 'Italian',
      calories: 500,
      protein: 25,
      carbs: 50,
      fat: 20,
      fiber: 10,
      sugar: 5
    };

    (recipeApi.createRecipe as jest.Mock).mockResolvedValue({
      data: { recipe: mockRecipe }
    });

    render(<RecipeFormScreen />);
    
    // Fill in all required fields
    fireEvent.changeText(screen.getByPlaceholderText('Recipe title'), 'Test Recipe');
    fireEvent.changeText(screen.getByPlaceholderText('Recipe description'), 'Test Description');
    fireEvent.changeText(screen.getByPlaceholderText('30'), '30');
    fireEvent.changeText(screen.getByPlaceholderText('Italian'), 'Italian');
    
    // Add ingredients
    fireEvent.press(screen.getByText('Add Ingredient'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., 2 cups flour'), 'Test ingredient');
    
    // Add instructions
    fireEvent.press(screen.getByText('Add Step'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., Preheat oven to 350°F'), 'Test step');
    
    // Fill macro nutrients
    fireEvent.changeText(screen.getByPlaceholderText('500'), '500');
    fireEvent.changeText(screen.getByPlaceholderText('25'), '25');
    fireEvent.changeText(screen.getByPlaceholderText('50'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('20'), '20');
    
    // Fill optional fields
    fireEvent.changeText(screen.getByPlaceholderText('10'), '10'); // Fiber
    fireEvent.changeText(screen.getByPlaceholderText('5'), '5'); // Sugar
    
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(recipeApi.createRecipe).toHaveBeenCalledWith({
        title: 'Test Recipe',
        description: 'Test Description',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 500,
        protein: 25,
        carbs: 50,
        fat: 20,
        fiber: 10,
        sugar: 5,
        ingredients: ['Test ingredient'],
        instructions: ['Test step']
      });
    });
  });

  test('should handle multiple ingredients and instructions', async () => {
    const mockRecipe = {
      id: 'recipe-1',
      title: 'Test Recipe',
      description: 'Test Description',
      cookTime: 30,
      cuisine: 'Italian',
      calories: 500,
      protein: 25,
      carbs: 50,
      fat: 20
    };

    (recipeApi.createRecipe as jest.Mock).mockResolvedValue({
      data: { recipe: mockRecipe }
    });

    render(<RecipeFormScreen />);
    
    // Fill in all required fields
    fireEvent.changeText(screen.getByPlaceholderText('Recipe title'), 'Test Recipe');
    fireEvent.changeText(screen.getByPlaceholderText('Recipe description'), 'Test Description');
    fireEvent.changeText(screen.getByPlaceholderText('30'), '30');
    fireEvent.changeText(screen.getByPlaceholderText('Italian'), 'Italian');
    
    // Add multiple ingredients
    fireEvent.press(screen.getByText('Add Ingredient'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., 2 cups flour'), 'Ingredient 1');
    
    fireEvent.press(screen.getByText('Add Ingredient'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., 2 cups flour'), 'Ingredient 2');
    
    // Add multiple instructions
    fireEvent.press(screen.getByText('Add Step'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., Preheat oven to 350°F'), 'Step 1');
    
    fireEvent.press(screen.getByText('Add Step'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g., Preheat oven to 350°F'), 'Step 2');
    
    // Fill macro nutrients
    fireEvent.changeText(screen.getByPlaceholderText('500'), '500');
    fireEvent.changeText(screen.getByPlaceholderText('25'), '25');
    fireEvent.changeText(screen.getByPlaceholderText('50'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('20'), '20');
    
    const saveButton = screen.getByText('Save Recipe');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(recipeApi.createRecipe).toHaveBeenCalledWith({
        title: 'Test Recipe',
        description: 'Test Description',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 500,
        protein: 25,
        carbs: 50,
        fat: 20,
        ingredients: ['Ingredient 1', 'Ingredient 2'],
        instructions: ['Step 1', 'Step 2']
      });
    });
  });
});
