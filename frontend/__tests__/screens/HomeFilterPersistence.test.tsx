// frontend/__tests__/screens/HomeFilterPersistence.test.tsx
// ROADMAP 4.0 FX1.1 — persistent header + filter row across all home body states.
//
// Structural test: mirrors the chrome+body layout shipped in app/(tabs)/index.tsx
// (HomeHeader + FilterRow above, body component below) and asserts FilterRow
// stays mounted across loading/error/generic-empty/no-results, so a user with
// over-restrictive filters can always reach a chip to deselect.

import React from 'react';
import { View } from 'react-native';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import FilterRow, { DEFAULT_FILTER_CHIPS } from '../../components/ui/FilterRow';
import HomeLoadingState from '../../components/home/HomeLoadingState';
import HomeErrorState from '../../components/home/HomeErrorState';
import HomeEmptyState from '../../components/home/HomeEmptyState';
import NoResultsState from '../../components/home/NoResultsState';

jest.mock('../../components/mascot', () => ({
  AnimatedLogoMascot: function MockAnimatedLogoMascot() {
    const { View } = require('react-native');
    return <View testID="mascot-animated" />;
  },
  LogoMascot: function MockLogoMascot() {
    const { View } = require('react-native');
    return <View testID="mascot-static" />;
  },
}));

jest.mock('../../components/mascot/Sazon', () => {
  const { View } = require('react-native');
  return function MockSazon() {
    return <View testID="sazon-mascot" />;
  };
});

jest.mock('../../components/recipe/RecipeCardSkeleton', () => {
  const { View } = require('react-native');
  return function MockSkeleton() {
    return <View testID="recipe-skeleton" />;
  };
});

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/ui/GradientButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockGradientButton({ label, onPress }: any) {
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{label}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: {
    buttonPress: jest.fn(),
    buttonPressPrimary: jest.fn(),
  },
}));

// ─── Fixture: chrome+body wrapper that mirrors app/(tabs)/index.tsx ────────────

const emptyFilters = {
  cuisines: [],
  dietaryRestrictions: [],
  maxCookTime: null,
  difficulty: [],
};

interface ChromeFixtureProps {
  body: React.ReactNode;
  onChipToggle?: (chipId: string) => void;
}

function ChromeFixture({ body, onChipToggle = jest.fn() }: ChromeFixtureProps) {
  return (
    <View>
      <FilterRow
        chips={DEFAULT_FILTER_CHIPS}
        activeChipIds={['easy']}
        activeAdvancedCount={1}
        onAdvancedFilterPress={jest.fn()}
        onChipToggle={onChipToggle}
      />
      {body}
    </View>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Home filter persistence (FX1.1)', () => {
  it('keeps FilterRow mounted in the loading body state', () => {
    const { getByTestId, getAllByTestId } = renderWithProviders(
      <ChromeFixture body={<HomeLoadingState viewMode="grid" />} />,
    );
    expect(getByTestId('filter-row')).toBeTruthy();
    expect(getAllByTestId('recipe-skeleton').length).toBeGreaterThan(0);
  });

  it('keeps FilterRow mounted in the error body state', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <ChromeFixture
        body={
          <HomeErrorState
            error="Network error"
            errorCode={null}
            failureClass={null}
            onRetry={jest.fn()}
          />
        }
      />,
    );
    expect(getByTestId('filter-row')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('keeps FilterRow mounted in the generic-empty body state', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <ChromeFixture
        body={
          <HomeEmptyState
            filters={{ ...emptyFilters, difficulty: ['Easy'] }}
            activeFilters={['Easy']}
            mealPrepMode={false}
            searchQuery=""
            onClearFilters={jest.fn()}
            onDisableMealPrep={jest.fn()}
            onClearSearch={jest.fn()}
            onRefresh={jest.fn()}
          />
        }
      />,
    );
    expect(getByTestId('filter-row')).toBeTruthy();
    expect(getByText('Clear All Filters')).toBeTruthy();
  });

  it('keeps FilterRow mounted in the no-results body state', () => {
    const { getByTestId } = renderWithProviders(
      <ChromeFixture
        body={
          <NoResultsState
            searchQuery="laksa"
            suggestions={[]}
            hasActiveFilters
            onSelectSuggestion={jest.fn()}
            onClearFilters={jest.fn()}
            onClearSearch={jest.fn()}
          />
        }
      />,
    );
    expect(getByTestId('filter-row')).toBeTruthy();
  });

  it('a chip in FilterRow stays interactive across all four states', () => {
    const onChipToggle = jest.fn();
    const states: React.ReactNode[] = [
      <HomeLoadingState key="loading" viewMode="grid" />,
      <HomeErrorState
        key="error"
        error="Network error"
        errorCode={null}
        failureClass={null}
        onRetry={jest.fn()}
      />,
      <HomeEmptyState
        key="empty"
        filters={emptyFilters}
        activeFilters={[]}
        mealPrepMode={false}
        searchQuery=""
        onClearFilters={jest.fn()}
        onDisableMealPrep={jest.fn()}
        onClearSearch={jest.fn()}
        onRefresh={jest.fn()}
      />,
      <NoResultsState
        key="no-results"
        searchQuery="laksa"
        suggestions={[]}
        hasActiveFilters={false}
        onSelectSuggestion={jest.fn()}
        onClearFilters={jest.fn()}
        onClearSearch={jest.fn()}
      />,
    ];
    const { fireEvent } = require('@testing-library/react-native');

    states.forEach((body) => {
      const { getByTestId, unmount } = renderWithProviders(
        <ChromeFixture body={body} onChipToggle={onChipToggle} />,
      );
      // The "easy" chip is rendered active because activeChipIds=['easy'] in the fixture.
      const chip = getByTestId('filter-row-chip-easy-active');
      fireEvent.press(chip);
      unmount();
    });

    expect(onChipToggle).toHaveBeenCalledTimes(states.length);
    expect(onChipToggle).toHaveBeenCalledWith('easy');
  });
});
