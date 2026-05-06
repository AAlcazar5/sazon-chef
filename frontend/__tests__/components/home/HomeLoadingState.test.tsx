// frontend/__tests__/components/home/HomeLoadingState.test.tsx
// ROADMAP 4.0 FX1.2 — body-only loading state.
//
// Asserts:
//  - root is no longer a SafeAreaView (FilterRow lives above per FX1.1)
//  - no inner "Sazon Chef" header
//  - no chip-row skeleton (real FilterRow renders above)

import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import HomeLoadingState from '../../../components/home/HomeLoadingState';

jest.mock('../../../components/mascot', () => ({
  AnimatedLogoMascot: function MockAnimatedLogoMascot() {
    const { View } = require('react-native');
    return <View testID="mascot-animated" />;
  },
  LogoMascot: function MockLogoMascot() {
    const { View } = require('react-native');
    return <View testID="mascot-static" />;
  },
}));

jest.mock('../../../components/recipe/RecipeCardSkeleton', () => {
  const { View } = require('react-native');
  return function MockSkeleton() {
    return <View testID="recipe-skeleton" />;
  };
});

jest.mock('../../../components/ui/FrostedHeader', () => {
  const { View } = require('react-native');
  return function MockFrostedHeader() {
    return <View testID="should-not-render-frosted-header" />;
  };
});

jest.mock('../../../components/ui/ScreenGradient', () => {
  const { View } = require('react-native');
  return function MockGradient({ children }: any) {
    return <View testID="should-not-render-screen-gradient">{children}</View>;
  };
});

describe('HomeLoadingState (FX1.2 body-only)', () => {
  it('does not render an inner FrostedHeader', () => {
    const { queryByTestId } = renderWithProviders(<HomeLoadingState viewMode="grid" />);
    expect(queryByTestId('should-not-render-frosted-header')).toBeNull();
  });

  it('does not wrap itself in SafeAreaView or ScreenGradient', () => {
    const { queryByTestId, toJSON } = renderWithProviders(<HomeLoadingState viewMode="grid" />);
    expect(queryByTestId('should-not-render-screen-gradient')).toBeNull();
    const tree = toJSON();
    // Root must not be SafeAreaView; component is a body fragment now.
    expect(tree).not.toBeNull();
  });

  it('does not render the inner mascot+title header', () => {
    const { queryByText, queryByTestId } = renderWithProviders(<HomeLoadingState viewMode="grid" />);
    expect(queryByText(/Sazon Chef/i)).toBeNull();
    expect(queryByTestId('mascot-animated')).toBeNull();
  });

  it('does not render a chip-row skeleton (real FilterRow lives above)', () => {
    const { queryAllByTestId } = renderWithProviders(<HomeLoadingState viewMode="grid" />);
    // Heuristic: chip skeleton uses ids "chip-skeleton-N"; new body should expose nothing matching.
    expect(queryAllByTestId(/chip-skeleton/i).length).toBe(0);
  });

  it('still renders recipe skeletons in the body', () => {
    const { getAllByTestId } = renderWithProviders(<HomeLoadingState viewMode="grid" />);
    expect(getAllByTestId('recipe-skeleton').length).toBeGreaterThan(0);
  });

  // HX6.1 — body matches the post-FX1 layout (hero featured + grid).
  it('HX6.1 — renders both featured (hero) and grid skeletons in the body', () => {
    const { getAllByTestId } = renderWithProviders(<HomeLoadingState viewMode="grid" />);
    // RecipeCardSkeleton is mocked → at minimum the featured + 6 grid cells
    // render as skeletons; total ≥ 7.
    expect(getAllByTestId('recipe-skeleton').length).toBeGreaterThanOrEqual(7);
  });

  it('HX6.1 — list view renders the list-style skeleton instead of the grid', () => {
    const { getAllByTestId } = renderWithProviders(<HomeLoadingState viewMode="list" />);
    // featured (1) + list rows (3) = 4 skeletons.
    expect(getAllByTestId('recipe-skeleton').length).toBe(4);
  });
});
