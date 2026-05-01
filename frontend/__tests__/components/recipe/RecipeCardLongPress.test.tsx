// frontend/__tests__/components/recipe/RecipeCardLongPress.test.tsx
// TDD: RecipeCard long-press → action sheet → "Add to shopping list"

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { RecipeCard } from '../../../components/recipe/RecipeCard';

// ── Global mocks ──────────────────────────────────────────────────────────────

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, theme: 'light' }),
  ThemeProvider: ({ children }: any) => children,
}));

const mockGenerateFromRecipes = jest.fn();
const mockShowToast = jest.fn();

jest.mock('../../../lib/api', () => ({
  recipeApi: {
    likeRecipe: jest.fn(),
    dislikeRecipe: jest.fn(),
    saveRecipe: jest.fn(),
    unsaveRecipe: jest.fn(),
  },
  shoppingListApi: {
    generateFromRecipes: (...args: any[]) => mockGenerateFromRecipes(...args),
  },
}));

jest.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
    Soft: 'soft',
    Rigid: 'rigid',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-image', () => ({
  Image: ({ testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID} />;
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

// Mock ActionSheet — renders items so we can press them
jest.mock('../../../components/ui/ActionSheet', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: function MockActionSheet({ visible, items, title, onClose }: any) {
      if (!visible) return null;
      return (
        <View testID="action-sheet">
          {title ? <Text testID="action-sheet-title">{title}</Text> : null}
          {items.map((item: any, i: number) => (
            <TouchableOpacity
              key={i}
              testID={`action-item-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
              onPress={() => {
                item.onPress();
                onClose();
              }}
            >
              <Text>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    },
  };
});

// ── Fixture ───────────────────────────────────────────────────────────────────

const mockRecipe = {
  id: 'recipe-abc',
  title: 'Spaghetti Carbonara',
  description: 'Classic Italian pasta dish',
  cookTime: 25,
  cuisine: 'Italian',
  calories: 620,
  protein: 28,
  carbs: 72,
  fat: 22,
  macros: { calories: 620, protein: 28, carbs: 72, fat: 22 },
  imageUrl: 'https://example.com/pasta.jpg',
  ingredients: ['pasta', 'eggs', 'bacon'],
  instructions: ['Cook pasta', 'Mix eggs', 'Combine'],
  score: { total: 90, macroScore: 88, tasteScore: 92, matchPercentage: 90 },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RecipeCard — long-press shopping list shortcut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateFromRecipes.mockResolvedValue({ data: { id: 'list-1' } });
  });

  it('opens action sheet on long-press (featured variant)', () => {
    const { getByTestId, queryByTestId } = render(
      <RecipeCard recipe={mockRecipe} variant="featured" />
    );
    expect(queryByTestId('action-sheet')).toBeNull();

    fireEvent(getByTestId('recipe-card-featured'), 'longPress');

    expect(getByTestId('action-sheet')).toBeTruthy();
  });

  it('opens action sheet on long-press (list variant)', () => {
    const { getByTestId, queryByTestId } = render(
      <RecipeCard recipe={mockRecipe} variant="list" />
    );
    expect(queryByTestId('action-sheet')).toBeNull();

    fireEvent(getByTestId('recipe-card-list'), 'longPress');

    expect(getByTestId('action-sheet')).toBeTruthy();
  });

  it('action sheet contains "Add to shopping list" option', () => {
    const { getByTestId, getByText } = render(
      <RecipeCard recipe={mockRecipe} variant="featured" />
    );
    fireEvent(getByTestId('recipe-card-featured'), 'longPress');

    expect(getByText('Add to shopping list')).toBeTruthy();
  });

  it('selecting "Add to shopping list" calls generateFromRecipes with correct recipeId', async () => {
    const { getByTestId } = render(
      <RecipeCard recipe={mockRecipe} variant="featured" />
    );
    fireEvent(getByTestId('recipe-card-featured'), 'longPress');

    await act(async () => {
      fireEvent.press(getByTestId('action-item-add-to-shopping-list'));
    });

    expect(mockGenerateFromRecipes).toHaveBeenCalledWith([mockRecipe.id]);
  });

  it('shows success toast after generateFromRecipes resolves', async () => {
    const { getByTestId } = render(
      <RecipeCard recipe={mockRecipe} variant="featured" />
    );
    fireEvent(getByTestId('recipe-card-featured'), 'longPress');

    await act(async () => {
      fireEvent.press(getByTestId('action-item-add-to-shopping-list'));
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(/added.*shopping list|shopping list/i),
        'success',
        expect.any(Number)
      );
    });
  });

  it('shows error toast when generateFromRecipes rejects', async () => {
    mockGenerateFromRecipes.mockRejectedValueOnce(new Error('Network error'));

    const { getByTestId } = render(
      <RecipeCard recipe={mockRecipe} variant="featured" />
    );
    fireEvent(getByTestId('recipe-card-featured'), 'longPress');

    await act(async () => {
      fireEvent.press(getByTestId('action-item-add-to-shopping-list'));
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.any(String),
        'error',
        expect.any(Number)
      );
    });
  });

  it('still fires external onLongPress prop alongside internal handler', () => {
    const externalHandler = jest.fn();
    const { getByTestId } = render(
      <RecipeCard recipe={mockRecipe} variant="featured" onLongPress={externalHandler} />
    );
    fireEvent(getByTestId('recipe-card-featured'), 'longPress');

    expect(externalHandler).toHaveBeenCalledWith(mockRecipe);
  });

  it('action sheet closes after selecting an option', async () => {
    const { getByTestId, queryByTestId } = render(
      <RecipeCard recipe={mockRecipe} variant="featured" />
    );
    fireEvent(getByTestId('recipe-card-featured'), 'longPress');
    expect(getByTestId('action-sheet')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('action-item-add-to-shopping-list'));
    });

    expect(queryByTestId('action-sheet')).toBeNull();
  });
});
