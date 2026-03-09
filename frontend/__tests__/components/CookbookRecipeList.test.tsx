// frontend/__tests__/components/CookbookRecipeList.test.tsx
// Phase 5: CookbookRecipeList — grid layout, image placeholder, star rating, chef-kiss flash

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CookbookRecipeList from '../../components/cookbook/CookbookRecipeList';
import type { SavedRecipe } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../components/recipe/RecipeCard', () => ({
  RecipeCard: function MockRecipeCard({ recipe, onPress, footer }: any) {
    const { TouchableOpacity, Text, View } = require('react-native');
    const hasImage = !!(recipe.imageUrl && recipe.imageUrl.trim() !== '');
    return (
      <TouchableOpacity testID={`recipe-card-${recipe.id}`} onPress={() => onPress?.(recipe.id)}>
        <View>
          <Text testID={`recipe-title-${recipe.id}`}>{recipe.title}</Text>
          {!hasImage && (
            <View testID={`image-placeholder-${recipe.id}`} accessibilityLabel="Recipe image placeholder" />
          )}
          {footer}
        </View>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../components/recipe/AnimatedRecipeCard', () => {
  return function MockAnimatedRecipeCard({ children }: any) {
    return children;
  };
});

jest.mock('../../components/cookbook/StarRating', () => {
  return function MockStarRating({ onRate, rating }: any) {
    const { TouchableOpacity, Text, View } = require('react-native');
    return (
      <View testID="star-rating">
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity
            key={s}
            testID={`star-${s}`}
            accessibilityLabel={`Rate ${s} star${s > 1 ? 's' : ''}`}
            onPress={() => onRate?.(s)}
          >
            <Text>{s <= (rating ?? 0) ? '★' : '☆'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
});

jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: any) {
    return require('react').createElement(Text, null, accessibilityLabel || 'icon');
  };
});

jest.mock('../../components/mascot/LogoMascot', () => {
  return function MockLogoMascot({ expression }: any) {
    return require('react').createElement(
      require('react-native').View,
      { testID: `logo-mascot-${expression}` },
    );
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeRecipe = (id: string, title: string, imageUrl?: string): SavedRecipe => ({
  id,
  title,
  description: 'Test recipe',
  cookTime: 25,
  difficulty: 'Easy',
  servings: 4,
  ingredients: [],
  instructions: [],
  nutritionInfo: { calories: 400, protein: 25, carbs: 40, fat: 12 },
  tags: [],
  cuisineType: 'Mexican',
  mealType: 'dinner',
  savedDate: '2025-01-01',
  rating: null,
  imageUrl,
});

const recipes: SavedRecipe[] = [
  makeRecipe('r1', 'Tacos', 'https://example.com/tacos.jpg'),
  makeRecipe('r2', 'Burrito'),         // no imageUrl
  makeRecipe('r3', 'Enchilada', ''),   // empty string — also no image
];

const defaultProps = {
  recipes,
  displayMode: 'grid' as const,
  isDark: false,
  userFeedback: {},
  feedbackLoading: null,
  animatedRecipeIds: new Set<string>(),
  onAnimated: jest.fn(),
  onRecipePress: jest.fn(),
  onRecipeLongPress: jest.fn(),
  onLike: jest.fn(),
  onDislike: jest.fn(),
  onSave: jest.fn(),
  onRate: jest.fn(),
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CookbookRecipeList', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('grid mode', () => {
    it('renders all recipe cards', () => {
      const { getByTestId } = render(<CookbookRecipeList {...defaultProps} />);
      expect(getByTestId('recipe-card-r1')).toBeTruthy();
      expect(getByTestId('recipe-card-r2')).toBeTruthy();
      expect(getByTestId('recipe-card-r3')).toBeTruthy();
    });

    it('renders recipe titles', () => {
      const { getByText } = render(<CookbookRecipeList {...defaultProps} />);
      expect(getByText('Tacos')).toBeTruthy();
      expect(getByText('Burrito')).toBeTruthy();
    });

    it('shows image placeholder when imageUrl is absent', () => {
      const { getByTestId, queryByTestId } = render(<CookbookRecipeList {...defaultProps} />);
      // r1 has an image — no placeholder
      expect(queryByTestId('image-placeholder-r1')).toBeNull();
      // r2 has no imageUrl — placeholder shown
      expect(getByTestId('image-placeholder-r2')).toBeTruthy();
      // r3 has empty string imageUrl — placeholder shown
      expect(getByTestId('image-placeholder-r3')).toBeTruthy();
    });

    it('placeholder has accessible label "Recipe image placeholder"', () => {
      const { getAllByLabelText } = render(<CookbookRecipeList {...defaultProps} />);
      const placeholders = getAllByLabelText('Recipe image placeholder');
      expect(placeholders.length).toBe(2); // r2 and r3
    });

    it('calls onRecipePress when a card is tapped', () => {
      const onRecipePress = jest.fn();
      const { getByTestId } = render(
        <CookbookRecipeList {...defaultProps} onRecipePress={onRecipePress} />
      );
      fireEvent.press(getByTestId('recipe-card-r1'));
      expect(onRecipePress).toHaveBeenCalledWith('r1');
    });
  });

  describe('list mode', () => {
    it('renders all recipe cards', () => {
      const { getByTestId } = render(
        <CookbookRecipeList {...defaultProps} displayMode="list" />
      );
      expect(getByTestId('recipe-card-r1')).toBeTruthy();
      expect(getByTestId('recipe-card-r2')).toBeTruthy();
    });

    it('shows image placeholder in list mode when imageUrl is absent', () => {
      const { getByTestId } = render(
        <CookbookRecipeList {...defaultProps} displayMode="list" />
      );
      expect(getByTestId('image-placeholder-r2')).toBeTruthy();
    });

    it('calls onRecipePress in list mode', () => {
      const onRecipePress = jest.fn();
      const { getByTestId } = render(
        <CookbookRecipeList {...defaultProps} displayMode="list" onRecipePress={onRecipePress} />
      );
      fireEvent.press(getByTestId('recipe-card-r2'));
      expect(onRecipePress).toHaveBeenCalledWith('r2');
    });
  });

  describe('star rating', () => {
    it('calls onRate with correct star value when star is tapped', () => {
      const onRate = jest.fn();
      const { getAllByTestId } = render(
        <CookbookRecipeList {...defaultProps} onRate={onRate} />
      );
      // Each recipe card has star buttons; tap star-3 on first card's StarRating
      fireEvent.press(getAllByTestId('star-3')[0]);
      expect(onRate).toHaveBeenCalledWith('r1', 3);
    });

    it('calls onRate with each star value 1–5', () => {
      const onRate = jest.fn();
      const { getAllByTestId } = render(
        <CookbookRecipeList {...defaultProps} onRate={onRate} />
      );
      for (let star = 1; star <= 5; star++) {
        fireEvent.press(getAllByTestId(`star-${star}`)[0]);
        expect(onRate).toHaveBeenCalledWith('r1', star);
      }
    });
  });

  describe('chef-kiss mascot flash', () => {
    it('chef-kiss mascot is not shown before any rating', () => {
      const { queryByTestId } = render(<CookbookRecipeList {...defaultProps} />);
      expect(queryByTestId('chef-kiss-mascot')).toBeNull();
    });

    it('chef-kiss mascot appears after tapping 5-star', async () => {
      const onRate = jest.fn();
      const { getAllByTestId, queryByTestId } = render(
        <CookbookRecipeList {...defaultProps} onRate={onRate} />
      );
      act(() => {
        fireEvent.press(getAllByTestId('star-5')[0]);
      });
      await waitFor(() => expect(queryByTestId('chef-kiss-mascot')).toBeTruthy());
    });

    it('chef-kiss mascot does NOT appear after tapping star 1–4', () => {
      const onRate = jest.fn();
      const { getAllByTestId, queryByTestId } = render(
        <CookbookRecipeList {...defaultProps} onRate={onRate} />
      );
      fireEvent.press(getAllByTestId('star-4')[0]);
      expect(queryByTestId('chef-kiss-mascot')).toBeNull();
    });
  });

  it('renders an empty list without crashing', () => {
    const { toJSON } = render(
      <CookbookRecipeList {...defaultProps} recipes={[]} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders star ratings for each card', () => {
    const { getAllByTestId } = render(<CookbookRecipeList {...defaultProps} />);
    expect(getAllByTestId('star-rating').length).toBeGreaterThan(0);
  });
});
