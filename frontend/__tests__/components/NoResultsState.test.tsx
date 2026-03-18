// frontend/__tests__/components/NoResultsState.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('../../components/mascot/SazonMascot', () => ({
  __esModule: true,
  default: () => null,
}));

import NoResultsState from '../../components/home/NoResultsState';
import { router } from 'expo-router';

describe('NoResultsState', () => {
  const defaultProps = {
    searchQuery: 'pad thai',
    suggestions: ['Pad See Ew', 'Thai Green Curry', 'Thai Basil Chicken'],
    hasActiveFilters: false,
    onSelectSuggestion: jest.fn(),
    onClearFilters: jest.fn(),
    onClearSearch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the search query in the header', () => {
    render(<NoResultsState {...defaultProps} />);
    expect(screen.getByText(/No recipes found for/)).toBeTruthy();
  });

  it('renders similar recipe suggestions', () => {
    render(<NoResultsState {...defaultProps} />);
    expect(screen.getByText('Pad See Ew')).toBeTruthy();
    expect(screen.getByText('Thai Green Curry')).toBeTruthy();
    expect(screen.getByText('Thai Basil Chicken')).toBeTruthy();
  });

  it('calls onSelectSuggestion when a suggestion is tapped', () => {
    render(<NoResultsState {...defaultProps} />);
    fireEvent.press(screen.getByText('Pad See Ew'));
    expect(defaultProps.onSelectSuggestion).toHaveBeenCalledWith('Pad See Ew');
  });

  it('does not show suggestions section when empty', () => {
    render(<NoResultsState {...defaultProps} suggestions={[]} />);
    expect(screen.queryByText('Similar recipes')).toBeNull();
  });

  it('limits suggestions to 4', () => {
    const manySuggestions = ['A', 'B', 'C', 'D', 'E', 'F'];
    render(<NoResultsState {...defaultProps} suggestions={manySuggestions} />);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('D')).toBeTruthy();
    expect(screen.queryByText('E')).toBeNull();
  });

  it('shows filter relaxation section when filters are active', () => {
    render(<NoResultsState {...defaultProps} hasActiveFilters={true} />);
    expect(screen.getByText('Try relaxing your filters')).toBeTruthy();
    expect(screen.getByText('Clear all filters')).toBeTruthy();
  });

  it('does not show filter section when no filters are active', () => {
    render(<NoResultsState {...defaultProps} hasActiveFilters={false} />);
    expect(screen.queryByText('Try relaxing your filters')).toBeNull();
  });

  it('calls onClearFilters when clear filters is tapped', () => {
    render(<NoResultsState {...defaultProps} hasActiveFilters={true} />);
    fireEvent.press(screen.getByText('Clear all filters'));
    expect(defaultProps.onClearFilters).toHaveBeenCalled();
  });

  it('shows generate recipe CTA', () => {
    render(<NoResultsState {...defaultProps} />);
    expect(screen.getByText('Generate a recipe instead')).toBeTruthy();
  });

  it('navigates to /generate with prefill on CTA press', () => {
    render(<NoResultsState {...defaultProps} />);
    fireEvent.press(screen.getByText(/Generate.*pad thai/));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/generate',
      params: { prefill: 'pad thai' },
    });
  });

  it('calls onClearSearch when clear search is tapped', () => {
    render(<NoResultsState {...defaultProps} />);
    fireEvent.press(screen.getByText('Clear search'));
    expect(defaultProps.onClearSearch).toHaveBeenCalled();
  });
});
