// frontend/__tests__/components/QuickFiltersBar.test.tsx
// Phase 4: QuickFiltersBar — spring-animated chips, filter toggling

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuickFiltersBar from '../../components/home/QuickFiltersBar';
import type { FilterState } from '../../lib/filterStorage';

const defaultFilters: FilterState = {
  cuisines: [],
  dietaryRestrictions: [],
  difficulty: [],
  maxCookTime: null,
};

const defaultProps = {
  selectedMood: null,
  onMoodPress: jest.fn(),
  onClearMood: jest.fn(),
  filters: defaultFilters,
  quickMacroFilters: { highProtein: false, lowCarb: false, lowCalorie: false },
  mealPrepMode: false,
  handleQuickFilter: jest.fn(),
  handleQuickMacroFilter: jest.fn(),
  handleToggleMealPrepMode: jest.fn(),
  onAdvancedFilterPress: jest.fn(),
};

describe('QuickFiltersBar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all filter chips', () => {
    const { getByText } = render(<QuickFiltersBar {...defaultProps} />);
    expect(getByText('Mood')).toBeTruthy();
    expect(getByText('Quick')).toBeTruthy();
    expect(getByText('Easy')).toBeTruthy();
    expect(getByText('High Protein')).toBeTruthy();
    expect(getByText('Low Carb')).toBeTruthy();
    expect(getByText('Low Cal')).toBeTruthy();
    expect(getByText('Meal Prep')).toBeTruthy();
    expect(getByText('Budget')).toBeTruthy();
    expect(getByText('One Pot')).toBeTruthy();
  });

  it('renders Advanced button', () => {
    const { getByText } = render(<QuickFiltersBar {...defaultProps} />);
    expect(getByText('Advanced')).toBeTruthy();
  });

  it('calls onAdvancedFilterPress when Advanced is pressed', () => {
    const { getByText } = render(<QuickFiltersBar {...defaultProps} />);
    fireEvent.press(getByText('Advanced'));
    expect(defaultProps.onAdvancedFilterPress).toHaveBeenCalledTimes(1);
  });

  it('calls onMoodPress when Mood chip is pressed', () => {
    const { getByText } = render(<QuickFiltersBar {...defaultProps} />);
    fireEvent.press(getByText('Mood'));
    expect(defaultProps.onMoodPress).toHaveBeenCalledTimes(1);
  });

  it('calls handleQuickFilter with maxCookTime=30 when Quick pressed', () => {
    const { getByText } = render(<QuickFiltersBar {...defaultProps} />);
    fireEvent.press(getByText('Quick'));
    expect(defaultProps.handleQuickFilter).toHaveBeenCalledWith('maxCookTime', 30);
  });

  it('toggles Quick off when already active (maxCookTime=30)', () => {
    const { getByText } = render(
      <QuickFiltersBar {...defaultProps} filters={{ ...defaultFilters, maxCookTime: 30 }} />
    );
    fireEvent.press(getByText('Quick'));
    expect(defaultProps.handleQuickFilter).toHaveBeenCalledWith('maxCookTime', null);
  });

  it('calls handleQuickMacroFilter("highProtein") when High Protein pressed', () => {
    const { getByText } = render(<QuickFiltersBar {...defaultProps} />);
    fireEvent.press(getByText('High Protein'));
    expect(defaultProps.handleQuickMacroFilter).toHaveBeenCalledWith('highProtein');
  });

  it('calls handleQuickMacroFilter("lowCarb") when Low Carb pressed', () => {
    const { getByText } = render(<QuickFiltersBar {...defaultProps} />);
    fireEvent.press(getByText('Low Carb'));
    expect(defaultProps.handleQuickMacroFilter).toHaveBeenCalledWith('lowCarb');
  });

  it('calls handleQuickMacroFilter("lowCalorie") when Low Cal pressed', () => {
    const { getByText } = render(<QuickFiltersBar {...defaultProps} />);
    fireEvent.press(getByText('Low Cal'));
    expect(defaultProps.handleQuickMacroFilter).toHaveBeenCalledWith('lowCalorie');
  });

  it('calls handleToggleMealPrepMode when Meal Prep pressed', () => {
    const { getByText } = render(<QuickFiltersBar {...defaultProps} />);
    fireEvent.press(getByText('Meal Prep'));
    expect(defaultProps.handleToggleMealPrepMode).toHaveBeenCalledWith(true);
  });

  it('shows selected mood label when mood is active', () => {
    const { getByText } = render(
      <QuickFiltersBar {...defaultProps} selectedMood={{ id: 'happy', emoji: '😊', label: 'Happy', description: '', color: '#F59E0B' }} />
    );
    expect(getByText('Happy')).toBeTruthy();
  });

  it('does not crash when all macros active', () => {
    const { toJSON } = render(
      <QuickFiltersBar
        {...defaultProps}
        quickMacroFilters={{ highProtein: true, lowCarb: true, lowCalorie: true }}
        mealPrepMode={true}
        filters={{ ...defaultFilters, maxCookTime: 30, difficulty: ['Easy'] }}
      />
    );
    expect(toJSON()).toBeTruthy();
  });
});
