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

  it('renders the body mascot element (no header mascot — FX1.2)', () => {
    const { getAllByTestId } = render(<HomeEmptyState {...defaultProps} />);
    // FX1.2: only the body LogoMascot renders; the inner Sazon Chef header is gone.
    expect(getAllByTestId(/mascot-/).length).toBe(1);
  });

  it('renders the "curious" body mascot expression with no filters', () => {
    const { getByTestId } = render(<HomeEmptyState {...defaultProps} />);
    expect(getByTestId('mascot-curious')).toBeTruthy();
  });

  it('renders "thinking" body mascot when mealPrepMode is true', () => {
    const { getByTestId } = render(
      <HomeEmptyState {...defaultProps} mealPrepMode={true} />
    );
    expect(getByTestId('mascot-thinking')).toBeTruthy();
  });

  it('does not render an inner "Sazon Chef" header (FX1.2)', () => {
    const { queryByText } = render(<HomeEmptyState {...defaultProps} />);
    expect(queryByText(/^Sazon Chef$/)).toBeNull();
  });

  // Y-Voice-5 (PR #89, 2026-05-21) — fallback titles rewritten in
  // Sazon voice. These assertions pin the current copy.
  it("renders \"Kitchen's empty for now\" when no filters or search", () => {
    const { getByText } = render(<HomeEmptyState {...defaultProps} />);
    expect(getByText("Kitchen's empty for now")).toBeTruthy();
  });

  it('renders contextual title when searchQuery is set', () => {
    const { getByText } = render(
      <HomeEmptyState {...defaultProps} searchQuery="pasta" />
    );
    expect(getByText('Couldn\'t find anything for "pasta"')).toBeTruthy();
  });

  it('renders "No meal prep matches yet" in mealPrepMode', () => {
    const { getByText } = render(
      <HomeEmptyState {...defaultProps} mealPrepMode={true} />
    );
    expect(getByText('No meal prep matches yet')).toBeTruthy();
  });

  it('renders "Nothing fits those filters" when active filters are set', () => {
    const { getByText } = render(
      <HomeEmptyState
        {...defaultProps}
        activeFilters={['Easy']}
        filters={{ ...emptyFilters, difficulty: ['Easy'] }}
      />
    );
    expect(getByText('Nothing fits those filters')).toBeTruthy();
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

  // ── FX3.2 — Relax this filter yield rows ─────────────────────────────────

  it('renders no yield rows when yields prop is absent', () => {
    const { queryByTestId } = render(<HomeEmptyState {...defaultProps} />);
    expect(queryByTestId('filter-yield-rows')).toBeNull();
  });

  it('renders top-2 yield rows when yields prop is provided (FX3.2)', () => {
    const onClearFilter = jest.fn();
    const yields = [
      { filterId: 'quick', label: 'Quick', remainingIfRemoved: 47 },
      { filterId: 'highProtein', label: 'High-Protein', remainingIfRemoved: 23 },
      { filterId: 'cuisines', label: 'Cuisines', remainingIfRemoved: 5 },
    ];
    const { getByTestId, queryByTestId } = render(
      <HomeEmptyState
        {...defaultProps}
        activeFilters={['Quick', 'High-Protein']}
        filters={{ ...emptyFilters, maxCookTime: 30 }}
        yields={yields}
        onClearFilter={onClearFilter}
      />
    );
    expect(getByTestId('filter-yield-rows')).toBeTruthy();
    expect(getByTestId('filter-yield-row-quick')).toBeTruthy();
    expect(getByTestId('filter-yield-row-highProtein')).toBeTruthy();
    // Third row clipped — only top 2 render.
    expect(queryByTestId('filter-yield-row-cuisines')).toBeNull();
  });

  it('calls onClearFilter(filterId) when a yield row is tapped (FX3.2)', () => {
    const onClearFilter = jest.fn();
    const yields = [
      { filterId: 'quick', label: 'Quick', remainingIfRemoved: 47 },
    ];
    const { getByTestId } = render(
      <HomeEmptyState
        {...defaultProps}
        activeFilters={['Quick']}
        filters={{ ...emptyFilters, maxCookTime: 30 }}
        yields={yields}
        onClearFilter={onClearFilter}
      />
    );
    fireEvent.press(getByTestId('filter-yield-row-quick'));
    expect(onClearFilter).toHaveBeenCalledWith('quick');
  });
});
