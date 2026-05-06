// ROADMAP 4.0 HX1.4 — EditorialHomeLayout macro widgets gate.
//
// When real macro data is provided, the macro grid renders. When any of
// the five (calories / protein / carbs / fat / fiber) is missing, the grid
// hides cleanly — no fake placeholder numbers ship to users.

import React from 'react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { EditorialHomeLayout } from '../../../components/home/EditorialHomeLayout';

// Heavy children mocks — keep this test focused on the macro-grid gate.
jest.mock('../../../components/home/EditorialMacroWidgets', () => ({
  EditorialMacroWidgets: function MockMacroWidgets() {
    const { View } = require('react-native');
    return <View testID="editorial-macro-widgets" />;
  },
}));

jest.mock('../../../components/ui/PlateHeroCard', () => ({
  PlateHeroCard: function MockHero() {
    const { View } = require('react-native');
    return <View testID="plate-hero" />;
  },
}));

jest.mock('../../../components/home/PantryPlateHeroCard', () => {
  const { View } = require('react-native');
  return function MockPantryHero() {
    return <View testID="pantry-plate-hero" />;
  };
});

jest.mock('../../../components/ui/VerticalCategoryRail', () => ({
  VerticalCategoryRail: function MockRail() {
    const { View } = require('react-native');
    return <View testID="vertical-category-rail" />;
  },
}));

jest.mock('../../../components/home/DidYouKnowCard', () => ({
  __esModule: true,
  default: function MockDYK() {
    const { View } = require('react-native');
    return <View testID="did-you-know-card" />;
  },
  DidYouKnowCard: function MockDYK2() {
    const { View } = require('react-native');
    return <View testID="did-you-know-card" />;
  },
}));

jest.mock('../../../components/home/KitchenIQPromoCard', () => ({
  __esModule: true,
  default: function MockKIQ() {
    const { View } = require('react-native');
    return <View testID="kitchen-iq-promo" />;
  },
  KitchenIQPromoCard: function MockKIQ2() {
    const { View } = require('react-native');
    return <View testID="kitchen-iq-promo" />;
  },
}));

jest.mock('../../../hooks/useTonightsPlate', () => ({
  useTonightsPlate: () => ({ plate: null }),
}));

const heroRecipe: any = {
  id: 'r1',
  title: 'Test Hero',
  imageUrl: 'https://example.com/x.jpg',
  cookTime: 25,
  calories: 500,
  protein: 30,
  carbs: 50,
  fat: 20,
  fiber: 5,
  cuisine: 'Italian',
  mealType: 'Lunch',
  score: { matchPercentage: 85 },
};

describe('EditorialHomeLayout macro widgets gate (HX1.4)', () => {
  it('hides the macro grid when no macros are provided', () => {
    const { queryByTestId } = renderWithProviders(
      <EditorialHomeLayout
        heroRecipe={heroRecipe}
        savedIds={new Set()}
        onRecipePress={() => undefined}
        onToggleSave={() => undefined}
      />,
    );
    expect(queryByTestId('editorial-macro-widgets')).toBeNull();
  });

  it('renders the macro grid when all five macros are provided', () => {
    const { getByTestId } = renderWithProviders(
      <EditorialHomeLayout
        heroRecipe={heroRecipe}
        savedIds={new Set()}
        calories={{ consumed: 1420, goal: 1800 }}
        protein={{ consumed: 98, goal: 120 }}
        carbs={{ consumed: 165, goal: 220 }}
        fat={{ consumed: 52, goal: 70 }}
        fiber={{ consumed: 22, goal: 30 }}
        onRecipePress={() => undefined}
        onToggleSave={() => undefined}
      />,
    );
    expect(getByTestId('editorial-macro-widgets')).toBeTruthy();
  });

  it('hides the macro grid when only some macros are provided', () => {
    const { queryByTestId } = renderWithProviders(
      <EditorialHomeLayout
        heroRecipe={heroRecipe}
        savedIds={new Set()}
        calories={{ consumed: 1420, goal: 1800 }}
        protein={{ consumed: 98, goal: 120 }}
        // carbs / fat / fiber omitted
        onRecipePress={() => undefined}
        onToggleSave={() => undefined}
      />,
    );
    expect(queryByTestId('editorial-macro-widgets')).toBeNull();
  });
});
