import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import RecipeCard from '../../components/recipe/RecipeCard';

// Mock the API
jest.mock('../../lib/api', () => ({
  recipeApi: {
    likeRecipe: jest.fn(),
    dislikeRecipe: jest.fn(),
    saveRecipe: jest.fn(),
    unsaveRecipe: jest.fn()
  }
}));

// Mock Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn()
}));

describe('RecipeCard', () => {
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
    imageUrl: 'https://example.com/image.jpg',
    score: {
      total: 85,
      macroScore: 80,
      tasteScore: 90,
      matchPercentage: 85
    }
  };

  const mockOnPress = jest.fn();
  const mockOnLike = jest.fn();
  const mockOnDislike = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render recipe information', () => {
    render(
      <RecipeCard
        recipe={mockRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Test Recipe')).toBeTruthy();
    expect(screen.getByText('Test Description')).toBeTruthy();
    expect(screen.getByText('30 min')).toBeTruthy();
    expect(screen.getByText('Italian')).toBeTruthy();
    expect(screen.getByText('500 cal')).toBeTruthy();
  });

  test('should display macro nutrients', () => {
    render(
      <RecipeCard
        recipe={mockRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('25g')).toBeTruthy(); // Protein
    expect(screen.getByText('50g')).toBeTruthy(); // Carbs
    expect(screen.getByText('20g')).toBeTruthy(); // Fat
  });

  test('should display score information', () => {
    render(
      <RecipeCard
        recipe={mockRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('85%')).toBeTruthy(); // Match percentage
  });

  test('should handle card press', () => {
    render(
      <RecipeCard
        recipe={mockRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    const card = screen.getByText('Test Recipe').parent;
    fireEvent.press(card);

    expect(mockOnPress).toHaveBeenCalledWith(mockRecipe);
  });

  test('should handle like button press', () => {
    render(
      <RecipeCard
        recipe={mockRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    const likeButton = screen.getByTestId('like-button');
    fireEvent.press(likeButton);

    expect(mockOnLike).toHaveBeenCalledWith(mockRecipe.id);
  });

  test('should handle dislike button press', () => {
    render(
      <RecipeCard
        recipe={mockRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    const dislikeButton = screen.getByTestId('dislike-button');
    fireEvent.press(dislikeButton);

    expect(mockOnDislike).toHaveBeenCalledWith(mockRecipe.id);
  });

  test('should handle save button press', () => {
    render(
      <RecipeCard
        recipe={mockRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByTestId('save-button');
    fireEvent.press(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith(mockRecipe.id);
  });

  test('should handle recipe without image', () => {
    const recipeWithoutImage = {
      ...mockRecipe,
      imageUrl: null
    };

    render(
      <RecipeCard
        recipe={recipeWithoutImage}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Test Recipe')).toBeTruthy();
    // Should still render without crashing
  });

  test('should handle recipe without score', () => {
    const recipeWithoutScore = {
      ...mockRecipe,
      score: null
    };

    render(
      <RecipeCard
        recipe={recipeWithoutScore}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Test Recipe')).toBeTruthy();
    // Should still render without crashing
  });

  test('should handle long recipe title', () => {
    const longTitleRecipe = {
      ...mockRecipe,
      title: 'This is a very long recipe title that should be truncated properly to avoid layout issues'
    };

    render(
      <RecipeCard
        recipe={longTitleRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(longTitleRecipe.title)).toBeTruthy();
  });

  test('should handle long recipe description', () => {
    const longDescRecipe = {
      ...mockRecipe,
      description: 'This is a very long recipe description that should be truncated properly to avoid layout issues and maintain good visual hierarchy'
    };

    render(
      <RecipeCard
        recipe={longDescRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(longDescRecipe.description)).toBeTruthy();
  });

  test('should handle zero values gracefully', () => {
    const zeroValuesRecipe = {
      ...mockRecipe,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      cookTime: 0
    };

    render(
      <RecipeCard
        recipe={zeroValuesRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('0 cal')).toBeTruthy();
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  test('should handle very high values', () => {
    const highValuesRecipe = {
      ...mockRecipe,
      calories: 9999,
      protein: 999,
      carbs: 999,
      fat: 999,
      cookTime: 999
    };

    render(
      <RecipeCard
        recipe={highValuesRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('9999 cal')).toBeTruthy();
    expect(screen.getByText('999 min')).toBeTruthy();
  });

  test('should handle missing optional fields', () => {
    const minimalRecipe = {
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

    render(
      <RecipeCard
        recipe={minimalRecipe}
        onPress={mockOnPress}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Test Recipe')).toBeTruthy();
    // Should render without crashing even with minimal data
  });
});
