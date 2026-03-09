// frontend/__tests__/components/HomeEmptyState.test.tsx
// Phase 4: HomeEmptyState — mascot renders, contextual titles, action buttons

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeEmptyState from '../../components/home/HomeEmptyState';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../components/mascot', () => ({
  AnimatedLogoMascot: function MockAnimatedLogoMascot({ expression }: any) {
    const { View } = require('react-native');
    return <View testID={`mascot-${expression}`} />;
  },
  LogoMascot: function MockLogoMascot({ expression }: any) {
    const { View } = require('react-native');
    return <View testID={`mascot-${expression}`} />;
  },
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: { buttonPressPrimary: jest.fn() },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const emptyFilters = {
  cuisines: [],
  dietaryRestrictions: [],
  maxCookTime: null,
  difficulty: [],
};

const defaultProps = {
  filters: emptyFilters,
  activeFilters: [],
  mealPrepMode: false,
  searchQuery: '',
  onClearFilters: jest.fn(),
  onDisableMealPrep: jest.fn(),
  onClearSearch: jest.fn(),
  onRefresh: jest.fn(),
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('HomeEmptyState', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a mascot element', () => {
    const { getAllByTestId } = render(<HomeEmptyState {...defaultProps} />);
    // Both AnimatedLogoMascot (header) and LogoMascot (body) render
    expect(getAllByTestId(/mascot-/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the "curious" mascot expression with no filters', () => {
    const { getAllByTestId } = render(<HomeEmptyState {...defaultProps} />);
    expect(getAllByTestId('mascot-curious').length).toBeGreaterThanOrEqual(1);
  });

  it('renders "thinking" mascot when mealPrepMode is true', () => {
    const { getAllByTestId } = render(
      <HomeEmptyState {...defaultProps} mealPrepMode={true} />
    );
    expect(getAllByTestId('mascot-thinking').length).toBeGreaterThanOrEqual(1);
  });

  it('renders "No recipes available" when no filters or search', () => {
    const { getByText } = render(<HomeEmptyState {...defaultProps} />);
    expect(getByText('No recipes available')).toBeTruthy();
  });

  it('renders contextual title when searchQuery is set', () => {
    const { getByText } = render(
      <HomeEmptyState {...defaultProps} searchQuery="pasta" />
    );
    expect(getByText('No recipes found for "pasta"')).toBeTruthy();
  });

  it('renders "No meal prep recipes found" in mealPrepMode', () => {
    const { getByText } = render(
      <HomeEmptyState {...defaultProps} mealPrepMode={true} />
    );
    expect(getByText('No meal prep recipes found')).toBeTruthy();
  });

  it('renders "No recipes match your filters" when active filters are set', () => {
    const { getByText } = render(
      <HomeEmptyState
        {...defaultProps}
        activeFilters={['Easy']}
        filters={{ ...emptyFilters, difficulty: ['Easy'] }}
      />
    );
    expect(getByText('No recipes match your filters')).toBeTruthy();
  });

  it('shows "Refresh Recipes" button when no filters or search', () => {
    const { getByText } = render(<HomeEmptyState {...defaultProps} />);
    expect(getByText('Refresh Recipes')).toBeTruthy();
  });

  it('calls onRefresh when "Refresh Recipes" is pressed', () => {
    const onRefresh = jest.fn();
    const { getByText } = render(
      <HomeEmptyState {...defaultProps} onRefresh={onRefresh} />
    );
    fireEvent.press(getByText('Refresh Recipes'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('shows "Clear All Filters" when activeFilters is non-empty', () => {
    const { getByText } = render(
      <HomeEmptyState
        {...defaultProps}
        activeFilters={['Vegan']}
        filters={{ ...emptyFilters, dietaryRestrictions: ['Vegan'] }}
      />
    );
    expect(getByText('Clear All Filters')).toBeTruthy();
  });

  it('calls onClearFilters when "Clear All Filters" is pressed', () => {
    const onClearFilters = jest.fn();
    const { getByText } = render(
      <HomeEmptyState
        {...defaultProps}
        activeFilters={['Vegan']}
        filters={{ ...emptyFilters, dietaryRestrictions: ['Vegan'] }}
        onClearFilters={onClearFilters}
      />
    );
    fireEvent.press(getByText('Clear All Filters'));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('shows "Clear Search" button when searchQuery is non-empty', () => {
    const { getByText } = render(
      <HomeEmptyState {...defaultProps} searchQuery="pasta" />
    );
    expect(getByText('Clear Search')).toBeTruthy();
  });

  it('calls onClearSearch when "Clear Search" is pressed', () => {
    const onClearSearch = jest.fn();
    const { getByText } = render(
      <HomeEmptyState {...defaultProps} searchQuery="pasta" onClearSearch={onClearSearch} />
    );
    fireEvent.press(getByText('Clear Search'));
    expect(onClearSearch).toHaveBeenCalled();
  });

  it('shows "Disable Meal Prep Mode" button when mealPrepMode is true', () => {
    const { getByText } = render(
      <HomeEmptyState {...defaultProps} mealPrepMode={true} />
    );
    expect(getByText('Disable Meal Prep Mode')).toBeTruthy();
  });
});
