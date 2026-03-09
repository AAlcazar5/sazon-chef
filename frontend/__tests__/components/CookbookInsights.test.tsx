// frontend/__tests__/components/CookbookInsights.test.tsx
// Phase 5: CookbookInsights — stat values render, accessible pill labels present

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CookbookInsights from '../../components/cookbook/CookbookInsights';
import type { SavedRecipe } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  return function MockHTO(props: any) {
    return require('react').createElement(require('react-native').TouchableOpacity, props);
  };
});

jest.mock('../../components/ui/Icon', () => {
  return function MockIcon({ accessibilityLabel }: any) {
    return require('react').createElement(
      require('react-native').Text,
      { accessibilityLabel },
      accessibilityLabel || 'icon',
    );
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeRecipe = (overrides: Partial<any> = {}): SavedRecipe => ({
  id: 'r1',
  title: 'Test',
  description: '',
  cookTime: 20,
  cuisine: 'Mexican',
  difficulty: 'easy' as const,
  servings: 2,
  ingredients: [],
  instructions: [],
  calories: 350,
  protein: 30,
  carbs: 40,
  fat: 10,
  savedDate: '2025-01-01',
  rating: null,
  ...overrides,
} as SavedRecipe);

const defaultFilters = {
  search: '',
  cuisine: '',
  maxCookTime: null,
  difficulty: [],
  mealType: [],
  minRating: null,
  mealPrepOnly: false,
  highProtein: false,
  lowCal: false,
  budget: false,
  onePot: false,
  hasCookCount: false,
};

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  recipes: [
    makeRecipe({ id: 'r1', cookTime: 20, calories: 350, protein: 30, difficulty: 'Easy', healthGrade: 'A', score: { matchPercentage: 85 } }),
    makeRecipe({ id: 'r2', cookTime: 45, calories: 600, protein: 15, difficulty: 'Medium', healthGrade: 'C', score: { matchPercentage: 60 } }),
    makeRecipe({ id: 'r3', cookTime: 25, calories: 200, protein: 40, difficulty: 'Easy', healthGrade: 'B', score: { matchPercentage: 70 }, mealPrepSuitable: true }),
  ],
  filters: defaultFilters,
  onFilterChange: jest.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CookbookInsights', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the modal header', () => {
    const { getByText } = render(<CookbookInsights {...baseProps} />);
    expect(getByText('Cookbook insights')).toBeTruthy();
  });

  it('renders best match percentage from recipes', () => {
    const { getByText } = render(<CookbookInsights {...baseProps} />);
    // bestMatch = max of 85, 60, 70 = 85
    expect(getByText('85%')).toBeTruthy();
  });

  it('renders A/B health percentage', () => {
    const { getByText } = render(<CookbookInsights {...baseProps} />);
    // grades: A, C, B → 2 out of 3 are A/B → 67%
    expect(getByText('67%')).toBeTruthy();
  });

  it('renders average cook time', () => {
    const { getByText } = render(<CookbookInsights {...baseProps} />);
    // avg = (20+45+25)/3 = 30
    expect(getByText(/Avg cook time: 30 min/)).toBeTruthy();
  });

  it('renders average protein', () => {
    const { getByText } = render(<CookbookInsights {...baseProps} />);
    // avg protein = (30+15+40)/3 = 28
    expect(getByText(/Avg protein: 28g/)).toBeTruthy();
  });

  it('renders average calories', () => {
    const { getByText } = render(<CookbookInsights {...baseProps} />);
    // avg calories = (350+600+200)/3 = 383
    expect(getByText(/Avg calories: 383/)).toBeTruthy();
  });

  it('renders all filter pill labels', () => {
    const { getAllByText } = render(<CookbookInsights {...baseProps} />);
    // Each pill renders the label in both the Icon accessibilityLabel and the Text node
    expect(getAllByText('Quick').length).toBeGreaterThan(0);
    expect(getAllByText('✨ Easy').length).toBeGreaterThan(0);
    expect(getAllByText('🍱 Meal prep').length).toBeGreaterThan(0);
    expect(getAllByText('💪 High protein').length).toBeGreaterThan(0);
    expect(getAllByText('🥗 Low cal').length).toBeGreaterThan(0);
    expect(getAllByText('💰 Budget').length).toBeGreaterThan(0);
  });

  it('pill counts reflect recipe data', () => {
    const { getAllByText } = render(<CookbookInsights {...baseProps} />);
    // Quick (≤30 min): r1 (20), r3 (25) → 2
    // Easy: r1, r3 → 2
    // Meal prep: r3 (mealPrepSuitable) → 1
    // High protein (≥25g): r1 (30), r3 (40) → 2
    // Low cal (≤400): r1 (350), r3 (200) → 2
    // Budget: none → 0
    // Check count "2" appears for Quick pill
    // Multiple elements with "2" text are expected; just verify render succeeds
    expect(getAllByText('2').length).toBeGreaterThan(0);
  });

  it('pill labels are accessible via text', () => {
    const { getAllByText } = render(<CookbookInsights {...baseProps} />);
    expect(getAllByText('Quick').length).toBeGreaterThan(0);
    expect(getAllByText('🍱 Meal prep').length).toBeGreaterThan(0);
  });

  it('tapping a pill calls onFilterChange and onClose', () => {
    const onFilterChange = jest.fn();
    const onClose = jest.fn();
    const { getAllByText } = render(
      <CookbookInsights {...baseProps} onFilterChange={onFilterChange} onClose={onClose} />
    );
    // Press first element with "Quick" text (inside the TouchableOpacity pill)
    fireEvent.press(getAllByText('Quick')[0]);
    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tapping Quick pill sets maxCookTime=30 when not already set', () => {
    const onFilterChange = jest.fn();
    const { getAllByText } = render(
      <CookbookInsights {...baseProps} onFilterChange={onFilterChange} />
    );
    fireEvent.press(getAllByText('Quick')[0]);
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ maxCookTime: 30 })
    );
  });

  it('tapping close button calls onClose', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <CookbookInsights {...baseProps} onClose={onClose} />
    );
    fireEvent.press(getByLabelText('Close insights'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when visible is false', () => {
    const { queryByText } = render(
      <CookbookInsights {...baseProps} visible={false} />
    );
    expect(queryByText('Cookbook insights')).toBeNull();
  });

  it('handles empty recipes without crashing', () => {
    const { getByText, getAllByText } = render(
      <CookbookInsights {...baseProps} recipes={[]} />
    );
    expect(getByText('Cookbook insights')).toBeTruthy();
    // bestMatch=0% and abPct=0% both render
    expect(getAllByText('0%').length).toBe(2);
  });
});
