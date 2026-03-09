// frontend/__tests__/components/RecipeCarouselSection.test.tsx
// Phase 4: RecipeCarouselSection — renders at least one recipe card when data present

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RecipeCarouselSection from '../../components/home/RecipeCarouselSection';
import type { SuggestedRecipe } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: any) {
    return <Text>{accessibilityLabel || 'icon'}</Text>;
  };
});

jest.mock('../../components/ui/AnimatedActivityIndicator', () => {
  const { View } = require('react-native');
  return function MockAAI() { return <View testID="activity-indicator" />; };
});

jest.mock('../../components/ui/SkeletonLoader', () => {
  const { View } = require('react-native');
  return function MockSkeleton() { return <View testID="skeleton" />; };
});

jest.mock('../../components/recipe/RecipeCard', () => ({
  RecipeCard: function MockRecipeCard({ recipe }: any) {
    const { Text, View } = require('react-native');
    return (
      <View testID={`recipe-card-${recipe.id}`}>
        <Text testID={`recipe-title-${recipe.id}`}>{recipe.title}</Text>
      </View>
    );
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeRecipe = (id: string): SuggestedRecipe => ({
  id,
  title: `Recipe ${id}`,
  description: 'Delicious',
  cookTime: 20,
  cuisine: 'Italian',
  difficulty: 'easy' as const,
  servings: 2,
  ingredients: [],
  instructions: [],
  calories: 300,
  protein: 20,
  carbs: 30,
  fat: 10,
  imageUrl: undefined,
  score: { total: 80, macroScore: 75, tasteScore: 80, matchPercentage: 80, breakdown: {} as any },
} as SuggestedRecipe);

const defaultProps = {
  title: 'Trending Recipes',
  emoji: '🔥',
  recipes: [makeRecipe('r1'), makeRecipe('r2'), makeRecipe('r3')],
  isCollapsed: false,
  onToggleCollapse: jest.fn(),
  isDark: false,
  isLoading: false,
  userFeedback: {},
  feedbackLoading: null,
  onRecipePress: jest.fn(),
  onRecipeLongPress: jest.fn(),
  onLike: jest.fn(),
  onDislike: jest.fn(),
  onSave: jest.fn(),
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RecipeCarouselSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the section title', () => {
    const { getByText } = render(<RecipeCarouselSection {...defaultProps} />);
    expect(getByText('Trending Recipes')).toBeTruthy();
  });

  it('renders the section emoji', () => {
    const { getByText } = render(<RecipeCarouselSection {...defaultProps} />);
    expect(getByText('🔥')).toBeTruthy();
  });

  it('renders at least one recipe card when recipes are present', () => {
    const { getByTestId } = render(<RecipeCarouselSection {...defaultProps} />);
    expect(getByTestId('recipe-card-r1')).toBeTruthy();
  });

  it('renders all recipe cards', () => {
    const { getByTestId } = render(<RecipeCarouselSection {...defaultProps} />);
    expect(getByTestId('recipe-card-r1')).toBeTruthy();
    expect(getByTestId('recipe-card-r2')).toBeTruthy();
    expect(getByTestId('recipe-card-r3')).toBeTruthy();
  });

  it('renders recipe titles', () => {
    const { getByText } = render(<RecipeCarouselSection {...defaultProps} />);
    expect(getByText('Recipe r1')).toBeTruthy();
  });

  it('shows recipe count in subtitle when subtitle is absent', () => {
    const { getByText } = render(<RecipeCarouselSection {...defaultProps} />);
    expect(getByText('3 recipes')).toBeTruthy();
  });

  it('uses custom subtitle when provided', () => {
    const { getByText } = render(
      <RecipeCarouselSection {...defaultProps} subtitle="Fresh picks for you" />
    );
    expect(getByText('Fresh picks for you')).toBeTruthy();
  });

  it('returns null when recipes is empty and not loading', () => {
    const { toJSON } = render(
      <RecipeCarouselSection {...defaultProps} recipes={[]} />
    );
    expect(toJSON()).toBeNull();
  });

  it('calls onToggleCollapse when header is pressed', () => {
    const onToggleCollapse = jest.fn();
    const { getByText } = render(
      <RecipeCarouselSection {...defaultProps} onToggleCollapse={onToggleCollapse} />
    );
    fireEvent.press(getByText('Trending Recipes'));
    expect(onToggleCollapse).toHaveBeenCalled();
  });

  it('hides recipe cards when isCollapsed=true', () => {
    const { queryByTestId } = render(
      <RecipeCarouselSection {...defaultProps} isCollapsed={true} />
    );
    expect(queryByTestId('recipe-card-r1')).toBeNull();
  });

  it('shows skeleton cards when loading with no recipes', () => {
    const { getAllByTestId } = render(
      <RecipeCarouselSection {...defaultProps} recipes={[]} isLoading={true} />
    );
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });
});
