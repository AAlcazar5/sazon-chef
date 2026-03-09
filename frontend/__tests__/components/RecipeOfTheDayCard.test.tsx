// frontend/__tests__/components/RecipeOfTheDayCard.test.tsx
// Phase 4 Screen Inventory: Home Screen hero card — image, fallback, header, callbacks

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RecipeOfTheDayCard from '../../components/home/RecipeOfTheDayCard';

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, theme: 'light' }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const mockRecipe = {
  id: 'recipe-1',
  title: 'Spicy Tacos al Pastor',
  description: 'A classic Mexican street food.',
  cookTime: 30,
  cuisine: 'Mexican',
  calories: 520,
  protein: 28,
  carbs: 42,
  fat: 18,
  ingredients: ['pork', 'pineapple', 'chili'],
  instructions: ['Marinate', 'Grill', 'Serve'],
  imageUrl: 'https://example.com/tacos.jpg',
};

const defaultProps = {
  recipe: mockRecipe as any,
  feedback: { liked: false, disliked: false },
  isFeedbackLoading: false,
  onPress: jest.fn(),
  onLongPress: jest.fn(),
  onLike: jest.fn(),
  onDislike: jest.fn(),
  onSave: jest.fn(),
};

describe('RecipeOfTheDayCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders "Recipe of the Day" header', () => {
    const { getByText } = render(<RecipeOfTheDayCard {...defaultProps} />);
    expect(getByText('Recipe of the Day')).toBeTruthy();
  });

  it('renders "Featured" badge', () => {
    const { getByText } = render(<RecipeOfTheDayCard {...defaultProps} />);
    expect(getByText('Featured')).toBeTruthy();
  });

  it('renders the recipe title', () => {
    const { getByText } = render(<RecipeOfTheDayCard {...defaultProps} />);
    expect(getByText('Spicy Tacos al Pastor')).toBeTruthy();
  });

  it('renders fallback icon when imageUrl is absent', () => {
    const recipeNoImage = { ...mockRecipe, imageUrl: undefined };
    const { getByLabelText } = render(
      <RecipeOfTheDayCard {...defaultProps} recipe={recipeNoImage as any} />,
    );
    expect(getByLabelText('Recipe image placeholder')).toBeTruthy();
  });

  it('renders without crashing when imageUrl is present (expo-image mock returns null)', () => {
    const { getByText } = render(<RecipeOfTheDayCard {...defaultProps} />);
    // expo-image Image mock returns null — card still renders title
    expect(getByText('Spicy Tacos al Pastor')).toBeTruthy();
  });

  it('calls onSave when save button is pressed', () => {
    const onSave = jest.fn();
    const { getByLabelText } = render(
      <RecipeOfTheDayCard {...defaultProps} onSave={onSave} />,
    );
    fireEvent.press(getByLabelText('Save recipe'));
    expect(onSave).toHaveBeenCalledWith('recipe-1');
  });

  it('calls onLike when like button is pressed', () => {
    const onLike = jest.fn();
    const { getByTestId } = render(
      <RecipeOfTheDayCard {...defaultProps} onLike={onLike} />,
    );
    fireEvent.press(getByTestId('like-button'));
    expect(onLike).toHaveBeenCalledWith('recipe-1');
  });

  it('calls onDislike when dislike button is pressed', () => {
    const onDislike = jest.fn();
    const { getByTestId } = render(
      <RecipeOfTheDayCard {...defaultProps} onDislike={onDislike} />,
    );
    fireEvent.press(getByTestId('dislike-button'));
    expect(onDislike).toHaveBeenCalledWith('recipe-1');
  });
});
