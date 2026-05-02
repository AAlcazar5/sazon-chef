// frontend/__tests__/components/meal-plan/CostAnalysisSection.test.tsx
// Tests for the simplified CostAnalysisSection (Group 10W)

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: {}, theme: 'light', isDark: false }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  createAnimatedComponent: (component: any) => component,
  useReducedMotion: () => false,
}));
jest.mock('../../../components/ui/BottomSheet', () => {
  return function MockBottomSheet(props: any) {
    if (!props.visible) return null;
    return require('react').createElement(
      require('react-native').View,
      { testID: 'cost-breakdown-sheet' },
      props.children,
    );
  };
});

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import CostAnalysisSection, {
  CostAnalysisData,
} from '../../../components/meal-plan/CostAnalysisSection';

const PRICED_MEAL = (id: string, cost: number, mealType = 'dinner') => ({
  id,
  name: `Meal ${id}`,
  cost,
  mealType,
  costSource: 'priced' as const,
});

const FALLBACK_MEAL = (id: string, cost: number, mealType = 'dinner') => ({
  id,
  name: `Fallback ${id}`,
  cost,
  mealType,
  costSource: 'unknown' as const,
});

const buildAnalysis = (
  overrides: Partial<CostAnalysisData> = {},
): CostAnalysisData => ({
  totalCost: 80,
  costPerDay: 11.43,
  costPerMeal: 5.0,
  mealsCount: 16,
  budgetExceeded: 0,
  budgetRemaining: 20,
  recommendations: ['Buy chicken thighs in bulk'],
  mealCosts: [
    PRICED_MEAL('a', 12, 'dinner'),
    PRICED_MEAL('b', 8, 'lunch'),
    PRICED_MEAL('c', 6, 'breakfast'),
  ],
  disclaimer: 'Sazon estimates · prices vary by store',
  ...overrides,
});

const SAVINGS = {
  store: 'Aldi',
  location: 'Downtown',
  savings: 14.2,
  savingsPercent: 18,
};

describe('CostAnalysisSection (10W simplified)', () => {
  test('hero line shows total weekly spend with $X / day eyebrow', () => {
    const { getByText, queryByText } = render(
      <CostAnalysisSection
        costAnalysis={buildAnalysis()}
        loadingCostAnalysis={false}
        shoppingListSavings={null}
        maxWeeklyBudget={100}
        isDark={false}
        onOptimize={jest.fn()}
      />,
    );

    expect(getByText('$80.00')).toBeTruthy();
    expect(getByText(/\$11\.43 \/ day/)).toBeTruthy();
    // Old "Per Day" mini stat is gone
    expect(queryByText('Per Day')).toBeNull();
  });

  test('no budget set → no status pill renders', () => {
    const { queryByLabelText } = render(
      <CostAnalysisSection
        costAnalysis={buildAnalysis({ budgetRemaining: 0, budgetExceeded: 0 })}
        loadingCostAnalysis={false}
        shoppingListSavings={null}
        maxWeeklyBudget={null}
        isDark={false}
        onOptimize={jest.fn()}
      />,
    );

    expect(queryByLabelText('On budget status')).toBeNull();
    expect(queryByLabelText('Over budget status')).toBeNull();
  });

  test('over budget → only the amber pill renders + Optimize visible', () => {
    const onOptimize = jest.fn();
    const { getByLabelText, queryByLabelText } = render(
      <CostAnalysisSection
        costAnalysis={buildAnalysis({
          totalCost: 130,
          budgetExceeded: 30,
          budgetRemaining: 0,
        })}
        loadingCostAnalysis={false}
        shoppingListSavings={null}
        maxWeeklyBudget={100}
        isDark={false}
        onOptimize={onOptimize}
      />,
    );

    const overPill = getByLabelText('Over budget status');
    expect(within(overPill).getByText(/Over by \$30\.00/)).toBeTruthy();
    expect(queryByLabelText('On budget status')).toBeNull();

    const optimizeBtn = getByLabelText('Optimize meal plan to fit budget');
    fireEvent.press(optimizeBtn);
    expect(onOptimize).toHaveBeenCalledTimes(1);
  });

  test('under budget → only green pill + no Optimize CTA', () => {
    const { getByLabelText, queryByLabelText } = render(
      <CostAnalysisSection
        costAnalysis={buildAnalysis({
          totalCost: 80,
          budgetExceeded: 0,
          budgetRemaining: 20,
        })}
        loadingCostAnalysis={false}
        shoppingListSavings={null}
        maxWeeklyBudget={100}
        isDark={false}
        onOptimize={jest.fn()}
      />,
    );

    const onPill = getByLabelText('On budget status');
    expect(within(onPill).getByText(/On budget · \$20\.00 left/)).toBeTruthy();
    expect(queryByLabelText('Over budget status')).toBeNull();
    expect(queryByLabelText('Optimize meal plan to fit budget')).toBeNull();
  });

  test('Optimize CTA hidden when over budget but estimate is fallback-heavy', () => {
    const fallbackMix: CostAnalysisData = buildAnalysis({
      totalCost: 130,
      budgetExceeded: 30,
      budgetRemaining: 0,
      mealCosts: [
        FALLBACK_MEAL('a', 12),
        FALLBACK_MEAL('b', 8),
        FALLBACK_MEAL('c', 6),
        PRICED_MEAL('d', 10),
      ],
    });
    const { queryByLabelText } = render(
      <CostAnalysisSection
        costAnalysis={fallbackMix}
        loadingCostAnalysis={false}
        shoppingListSavings={null}
        maxWeeklyBudget={100}
        isDark={false}
        onOptimize={jest.fn()}
      />,
    );

    expect(queryByLabelText('Optimize meal plan to fit budget')).toBeNull();
  });

  test('"See breakdown" sheet preserves per-meal, store, recommendation data', () => {
    const { getByLabelText, getByText } = render(
      <CostAnalysisSection
        costAnalysis={buildAnalysis()}
        loadingCostAnalysis={false}
        shoppingListSavings={SAVINGS}
        maxWeeklyBudget={100}
        isDark={false}
        onOptimize={jest.fn()}
      />,
    );

    fireEvent.press(getByLabelText('See cost breakdown'));

    expect(getByText('Per-Meal Costs')).toBeTruthy();
    expect(getByText('Meal a')).toBeTruthy();
    expect(getByText('Meal b')).toBeTruthy();
    expect(getByText('Meal c')).toBeTruthy();
    expect(getByText('Best Store')).toBeTruthy();
    expect(getByText(/Aldi/)).toBeTruthy();
    expect(getByText(/Save \$14\.20/)).toBeTruthy();
    expect(getByText(/Buy chicken thighs in bulk/)).toBeTruthy();
  });

  test('fallback ratio > 40% → incomplete-estimate banner replaces dollar total', () => {
    const heavyFallback: CostAnalysisData = buildAnalysis({
      totalCost: 80,
      mealCosts: [
        FALLBACK_MEAL('a', 12),
        FALLBACK_MEAL('b', 8),
        FALLBACK_MEAL('c', 6),
        FALLBACK_MEAL('d', 10),
        PRICED_MEAL('e', 9),
      ],
    });
    const { queryByText, getByText } = render(
      <CostAnalysisSection
        costAnalysis={heavyFallback}
        loadingCostAnalysis={false}
        shoppingListSavings={null}
        maxWeeklyBudget={100}
        isDark={false}
        onOptimize={jest.fn()}
      />,
    );

    expect(queryByText('$80.00')).toBeNull();
    expect(
      getByText(/Cost estimates incomplete/i),
    ).toBeTruthy();
    expect(
      getByText(/add pantry items or import recipes/i),
    ).toBeTruthy();
  });

  test('inline progress bar renders with budget context', () => {
    const { getByLabelText } = render(
      <CostAnalysisSection
        costAnalysis={buildAnalysis({ totalCost: 60 })}
        loadingCostAnalysis={false}
        shoppingListSavings={null}
        maxWeeklyBudget={100}
        isDark={false}
        onOptimize={jest.fn()}
      />,
    );

    expect(getByLabelText('Weekly budget progress')).toBeTruthy();
  });
});
