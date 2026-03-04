import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RecipeFormScreen from '../../app/recipe-form';
import { recipeApi, collectionsApi } from '../../lib/api';

// Mock the API - must include all imports the component uses
jest.mock('../../lib/api', () => ({
  recipeApi: {
    createRecipe: jest.fn(),
    updateRecipe: jest.fn(),
    getRecipe: jest.fn()
  },
  collectionsApi: {
    list: jest.fn(),
    create: jest.fn()
  },
  aiRecipeApi: {
    generateRecipe: jest.fn()
  }
}));

const mockAlert = jest.fn();

// Helper to fill all required fields
async function fillRequiredFields() {
  fireEvent.changeText(screen.getByPlaceholderText('Enter recipe title'), 'Test Recipe');
  fireEvent.changeText(screen.getByPlaceholderText('Describe your recipe'), 'Test Description');
  // Cook time and protein both have placeholder '30'; cook time renders first
  fireEvent.changeText(screen.getAllByPlaceholderText('30')[0], '30'); // cook time
  fireEvent.changeText(screen.getByPlaceholderText('Italian'), 'Italian');
  fireEvent.changeText(screen.getByPlaceholderText('500'), '500'); // calories
  fireEvent.changeText(screen.getAllByPlaceholderText('30')[1], '30'); // protein
  fireEvent.changeText(screen.getByPlaceholderText('50'), '50'); // carbs
  fireEvent.changeText(screen.getByPlaceholderText('15'), '15'); // fat
  fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1'), 'Test ingredient');
  fireEvent.changeText(screen.getByPlaceholderText('Step 1 instructions'), 'Test step');
}

describe('RecipeFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);
    (collectionsApi.list as jest.Mock).mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should render form with default values', () => {
    render(<RecipeFormScreen />);

    expect(screen.getByText('Create Recipe')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter recipe title')).toBeTruthy();
    expect(screen.getByPlaceholderText('Describe your recipe')).toBeTruthy();
  });

  test('should validate title field', async () => {
    render(<RecipeFormScreen />);

    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please enter a recipe title');
    });
  });

  test('should validate description field', async () => {
    render(<RecipeFormScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter recipe title'), 'Test Recipe');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please enter a description');
    });
  });

  test('should validate cook time field', async () => {
    render(<RecipeFormScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter recipe title'), 'Test Recipe');
    fireEvent.changeText(screen.getByPlaceholderText('Describe your recipe'), 'Test Description');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please enter a valid cook time');
    });
  });

  test('should validate cuisine field', async () => {
    render(<RecipeFormScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter recipe title'), 'Test Recipe');
    fireEvent.changeText(screen.getByPlaceholderText('Describe your recipe'), 'Test Description');
    fireEvent.changeText(screen.getAllByPlaceholderText('30')[0], '30'); // cook time
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please enter a cuisine type');
    });
  });

  test('should validate calories field', async () => {
    render(<RecipeFormScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter recipe title'), 'Test Recipe');
    fireEvent.changeText(screen.getByPlaceholderText('Describe your recipe'), 'Test Description');
    fireEvent.changeText(screen.getAllByPlaceholderText('30')[0], '30');
    fireEvent.changeText(screen.getByPlaceholderText('Italian'), 'Italian');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please enter valid calorie amount');
    });
  });

  test('should validate ingredients field', async () => {
    render(<RecipeFormScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter recipe title'), 'Test Recipe');
    fireEvent.changeText(screen.getByPlaceholderText('Describe your recipe'), 'Test Description');
    fireEvent.changeText(screen.getAllByPlaceholderText('30')[0], '30');
    fireEvent.changeText(screen.getByPlaceholderText('Italian'), 'Italian');
    fireEvent.changeText(screen.getByPlaceholderText('500'), '500');
    fireEvent.changeText(screen.getAllByPlaceholderText('30')[1], '30');
    fireEvent.changeText(screen.getByPlaceholderText('50'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('15'), '15');
    // Ingredient left empty — fire save without filling it
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please add at least one ingredient');
    });
  });

  test('should validate instructions field', async () => {
    render(<RecipeFormScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter recipe title'), 'Test Recipe');
    fireEvent.changeText(screen.getByPlaceholderText('Describe your recipe'), 'Test Description');
    fireEvent.changeText(screen.getAllByPlaceholderText('30')[0], '30');
    fireEvent.changeText(screen.getByPlaceholderText('Italian'), 'Italian');
    fireEvent.changeText(screen.getByPlaceholderText('500'), '500');
    fireEvent.changeText(screen.getAllByPlaceholderText('30')[1], '30');
    fireEvent.changeText(screen.getByPlaceholderText('50'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('15'), '15');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1'), 'Test ingredient');
    // Instruction left empty
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please add at least one instruction');
    });
  });

  test('should add and remove ingredients', () => {
    render(<RecipeFormScreen />);

    // Initially has one ingredient input
    expect(screen.getByPlaceholderText('Ingredient 1')).toBeTruthy();

    // Add a second ingredient
    fireEvent.press(screen.getByTestId('add-ingredient-btn'));
    expect(screen.getByPlaceholderText('Ingredient 2')).toBeTruthy();

    // Remove the second ingredient
    fireEvent.press(screen.getByTestId('remove-ingredient-1'));
    expect(screen.queryByPlaceholderText('Ingredient 2')).toBeFalsy();
  });

  test('should add and remove instructions', () => {
    render(<RecipeFormScreen />);

    // Initially has one instruction input
    expect(screen.getByPlaceholderText('Step 1 instructions')).toBeTruthy();

    // Add a second instruction
    fireEvent.press(screen.getByTestId('add-step-btn'));
    expect(screen.getByPlaceholderText('Step 2 instructions')).toBeTruthy();

    // Remove the second instruction
    fireEvent.press(screen.getByTestId('remove-instruction-1'));
    expect(screen.queryByPlaceholderText('Step 2 instructions')).toBeFalsy();
  });

  test('should create recipe with valid data', async () => {
    const mockRecipe = { id: 'recipe-1', title: 'Test Recipe' };
    (recipeApi.createRecipe as jest.Mock).mockResolvedValue({ data: { data: mockRecipe } });

    render(<RecipeFormScreen />);
    await fillRequiredFields();
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(recipeApi.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Recipe',
          description: 'Test Description',
          cookTime: 30,
          cuisine: 'Italian',
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 15,
          ingredients: ['Test ingredient'],
          instructions: ['Test step']
        })
      );
    });
  });

  test('should handle API errors gracefully', async () => {
    (recipeApi.createRecipe as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<RecipeFormScreen />);
    await fillRequiredFields();
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Network error');
    });
  });

  test('should handle optional fiber and sugar fields', async () => {
    const mockRecipe = { id: 'recipe-1' };
    (recipeApi.createRecipe as jest.Mock).mockResolvedValue({ data: { data: mockRecipe } });

    render(<RecipeFormScreen />);
    await fillRequiredFields();
    // Fiber placeholder is '5', sugar placeholder is '10'
    fireEvent.changeText(screen.getByPlaceholderText('5'), '10'); // fiber = 10
    fireEvent.changeText(screen.getByPlaceholderText('10'), '5'); // sugar = 5
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(recipeApi.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ fiber: 10, sugar: 5 })
      );
    });
  });

  test('should handle multiple ingredients and instructions', async () => {
    const mockRecipe = { id: 'recipe-1' };
    (recipeApi.createRecipe as jest.Mock).mockResolvedValue({ data: { data: mockRecipe } });

    render(<RecipeFormScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter recipe title'), 'Test Recipe');
    fireEvent.changeText(screen.getByPlaceholderText('Describe your recipe'), 'Test Description');
    fireEvent.changeText(screen.getAllByPlaceholderText('30')[0], '30');
    fireEvent.changeText(screen.getByPlaceholderText('Italian'), 'Italian');
    fireEvent.changeText(screen.getByPlaceholderText('500'), '500');
    fireEvent.changeText(screen.getAllByPlaceholderText('30')[1], '30');
    fireEvent.changeText(screen.getByPlaceholderText('50'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('15'), '15');

    // Two ingredients
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1'), 'First ingredient');
    fireEvent.press(screen.getByTestId('add-ingredient-btn'));
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 2'), 'Second ingredient');

    // Two instructions
    fireEvent.changeText(screen.getByPlaceholderText('Step 1 instructions'), 'First step');
    fireEvent.press(screen.getByTestId('add-step-btn'));
    fireEvent.changeText(screen.getByPlaceholderText('Step 2 instructions'), 'Second step');

    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(recipeApi.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          ingredients: ['First ingredient', 'Second ingredient'],
          instructions: ['First step', 'Second step']
        })
      );
    });
  });

  test('should handle recipe type selection', () => {
    render(<RecipeFormScreen />);

    fireEvent.press(screen.getByText('Snack'));
    expect(screen.getByText('Snack')).toBeTruthy();

    fireEvent.press(screen.getByText('Dessert'));
    expect(screen.getByText('Dessert')).toBeTruthy();

    // Switch back to Meal (meal sub-types should appear)
    fireEvent.press(screen.getByText('Meal'));
    expect(screen.getByText('Breakfast')).toBeTruthy();
  });
});
