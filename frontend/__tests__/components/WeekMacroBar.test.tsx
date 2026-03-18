// frontend/__tests__/components/WeekMacroBar.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import WeekMacroBar from '../../components/meal-plan/WeekMacroBar';

describe('WeekMacroBar', () => {
  const defaultTotals = {
    calories: 14000,
    protein: 1050,
    carbs: 1400,
    fat: 469,
    fiber: 210,
  };

  const defaultTargets = {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 67,
    fiber: 30,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 5 macro labels', () => {
    render(<WeekMacroBar weeklyTotals={defaultTotals} dailyTargets={defaultTargets} />);
    expect(screen.getByText('Protein')).toBeTruthy();
    expect(screen.getByText('Carbs')).toBeTruthy();
    expect(screen.getByText('Fat')).toBeTruthy();
    expect(screen.getByText('Fiber')).toBeTruthy();
    expect(screen.getByText('Cal')).toBeTruthy();
  });

  it('renders the "Weekly Nutrition" header', () => {
    render(<WeekMacroBar weeklyTotals={defaultTotals} />);
    expect(screen.getByText('Weekly Nutrition')).toBeTruthy();
  });

  it('shows daily averages (current / days)', () => {
    render(<WeekMacroBar weeklyTotals={defaultTotals} dailyTargets={defaultTargets} />);
    // 14000 / 7 = 2000 → "2000" for calories
    expect(screen.getByText('2000')).toBeTruthy();
    // 1050 / 7 = 150 → "150g" for protein
    expect(screen.getByText('150g')).toBeTruthy();
  });

  it('shows daily targets as denominators', () => {
    render(<WeekMacroBar weeklyTotals={defaultTotals} dailyTargets={defaultTargets} />);
    // /150g for protein target
    expect(screen.getByText('/150g')).toBeTruthy();
    // /30g for fiber target
    expect(screen.getByText('/30g')).toBeTruthy();
  });

  it('shows fiber explainer when Fiber label is tapped', () => {
    render(<WeekMacroBar weeklyTotals={defaultTotals} dailyTargets={defaultTargets} />);
    // Explainer should not be visible initially
    expect(screen.queryByText(/gut microbiome/)).toBeNull();

    // Tap the Fiber bar (find its accessibility label)
    const fiberBar = screen.getByLabelText(/Fiber:/);
    fireEvent.press(fiberBar);

    // Explainer should now be visible
    expect(screen.getByText(/gut microbiome/)).toBeTruthy();
  });

  it('hides fiber explainer on second tap', () => {
    render(<WeekMacroBar weeklyTotals={defaultTotals} dailyTargets={defaultTargets} />);
    const fiberBar = screen.getByLabelText(/Fiber:/);

    fireEvent.press(fiberBar);
    expect(screen.getByText(/gut microbiome/)).toBeTruthy();

    fireEvent.press(fiberBar);
    expect(screen.queryByText(/gut microbiome/)).toBeNull();
  });

  it('uses default daily targets when none provided', () => {
    render(<WeekMacroBar weeklyTotals={defaultTotals} />);
    // Should render without errors with default targets
    expect(screen.getByText('Protein')).toBeTruthy();
    expect(screen.getByText('Fiber')).toBeTruthy();
  });

  it('renders accessibility labels with current and target values', () => {
    render(<WeekMacroBar weeklyTotals={defaultTotals} dailyTargets={defaultTargets} />);
    // Each macro has an accessibilityLabel like "Protein: 1050g of 1050g"
    expect(screen.getByLabelText(/Protein: 1050g of 1050g/)).toBeTruthy();
    expect(screen.getByLabelText(/Fiber: 210g of 210g/)).toBeTruthy();
  });

  it('handles zero totals gracefully', () => {
    const zeroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    render(<WeekMacroBar weeklyTotals={zeroTotals} />);
    expect(screen.getByText('Protein')).toBeTruthy();
    // All macros show "0g" — verify at least one exists
    expect(screen.getAllByText('0g').length).toBeGreaterThanOrEqual(4);
  });
});
