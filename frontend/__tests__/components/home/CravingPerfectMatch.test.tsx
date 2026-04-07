// frontend/__tests__/components/home/CravingPerfectMatch.test.tsx
// Tests for "Perfect Match" badge rendering on RecipeCard (10D-ii)

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { RecipeCard } from '../../../components/recipe/RecipeCard';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, theme: 'light' }),
  ThemeProvider: ({ children }: any) => children,
}));

jest.mock('../../../lib/api', () => ({
  recipeApi: {
    likeRecipe: jest.fn(),
    dislikeRecipe: jest.fn(),
    saveRecipe: jest.fn(),
    unsaveRecipe: jest.fn(),
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const baseRecipe = {
  id: 'r1',
  title: 'Cheesy Quesadillas',
  description: 'Loaded with cheese',
  cookTime: 20,
  cuisine: 'Mexican',
  calories: 450,
  protein: 20,
  carbs: 45,
  fat: 18,
  ingredients: ['tortilla', 'cheese'],
  instructions: ['Assemble', 'Cook'],
  score: { total: 90, macroScore: 85, tasteScore: 95, matchPercentage: 90 },
};

describe('RecipeCard — Perfect Match badge', () => {
  it('renders "Perfect Match" badge when perfectMatch is true', () => {
    render(
      <RecipeCard
        recipe={{ ...baseRecipe, perfectMatch: true } as any}
        variant="list"
      />,
    );
    expect(screen.getByText('Perfect Match')).toBeTruthy();
  });

  it('does not render badge when perfectMatch is false', () => {
    render(
      <RecipeCard
        recipe={{ ...baseRecipe, perfectMatch: false } as any}
        variant="list"
      />,
    );
    expect(screen.queryByText('Perfect Match')).toBeNull();
  });

  it('does not render badge when perfectMatch is absent', () => {
    render(
      <RecipeCard
        recipe={baseRecipe as any}
        variant="list"
      />,
    );
    expect(screen.queryByText('Perfect Match')).toBeNull();
  });

  it('does not render badge when showTopMatchBadge is true (no overlap)', () => {
    render(
      <RecipeCard
        recipe={{ ...baseRecipe, perfectMatch: true } as any}
        variant="list"
        showTopMatchBadge
      />,
    );
    // Top Match takes priority; Perfect Match badge should not appear
    expect(screen.queryByText('Perfect Match')).toBeNull();
    expect(screen.getByText('Top Match')).toBeTruthy();
  });
});
