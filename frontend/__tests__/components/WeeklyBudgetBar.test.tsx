// frontend/__tests__/components/WeeklyBudgetBar.test.tsx
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import WeeklyBudgetBar from '../../components/meal-plan/WeeklyBudgetBar';
import type { WeeklyBudgetSnapshot } from '../../hooks/useBudget';

function makeBudget(overrides: Partial<WeeklyBudgetSnapshot> = {}): WeeklyBudgetSnapshot {
  return {
    weekStart: '2026-04-13',
    weekEnd: '2026-04-19',
    daysRemaining: 5,
    targets: { dailyCalories: 2000, dailyProtein: 150, weeklyCalories: 14000, weeklyProtein: 1050 },
    consumed: { calories: 3500, protein: 250 },
    remaining: { calories: 10500, protein: 800 },
    adjusted: { todayCalories: 2100, todayProtein: 160, deltaCalories: 100, deltaProtein: 10 },
    ...overrides,
  };
}

describe('WeeklyBudgetBar', () => {
  test('renders nothing when budget is null', () => {
    const { toJSON } = render(<WeeklyBudgetBar budget={null} />);
    expect(toJSON()).toBeNull();
  });

  test('renders remaining calories + days remaining', () => {
    const { getByText } = render(<WeeklyBudgetBar budget={makeBudget()} />);
    expect(getByText(/10,?500/)).toBeTruthy();
    expect(getByText(/5 days/i)).toBeTruthy();
  });

  test('shows surplus indicator when adjusted today > daily target', () => {
    const { getByTestId } = render(<WeeklyBudgetBar budget={makeBudget()} />);
    const rollover = getByTestId('weekly-budget-rollover');
    expect(rollover.props.accessibilityLabel).toMatch(/surplus|\+/i);
  });

  test('shows deficit indicator when adjusted today < daily target', () => {
    const budget = makeBudget({
      adjusted: { todayCalories: 1800, todayProtein: 140, deltaCalories: -200, deltaProtein: -10 },
    });
    const { getByTestId } = render(<WeeklyBudgetBar budget={budget} />);
    const rollover = getByTestId('weekly-budget-rollover');
    expect(rollover.props.accessibilityLabel).toMatch(/deficit|-/i);
  });

  test('hides rollover indicator when on target (delta === 0)', () => {
    const budget = makeBudget({
      adjusted: { todayCalories: 2000, todayProtein: 150, deltaCalories: 0, deltaProtein: 0 },
    });
    const { queryByTestId } = render(<WeeklyBudgetBar budget={budget} />);
    expect(queryByTestId('weekly-budget-rollover')).toBeNull();
  });

  test('has root accessibility label', () => {
    const { getByTestId } = render(<WeeklyBudgetBar budget={makeBudget()} />);
    expect(getByTestId('weekly-budget-bar').props.accessibilityLabel).toBeTruthy();
  });

  test('renders protein row alongside calories', () => {
    const { getByText } = render(<WeeklyBudgetBar budget={makeBudget()} />);
    expect(getByText(/800.*g/i)).toBeTruthy();
  });
});
