// frontend/__tests__/components/build-a-plate/BudgetToggle.test.tsx
// Group 10X Phase 9 — Budget toggle pill + cost pill on plate totals row.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import BudgetToggle, { CostPill, sortByCost } from '../../../components/build-a-plate/BudgetToggle';
import type { MealComponent } from '../../../lib/api';

const SALMON: MealComponent = {
  id: 'salmon',
  slot: 'protein',
  name: 'Salmon',
  defaultPortionGrams: 150,
  caloriesPerPortion: 280,
  proteinG: 30,
  carbsG: 0,
  fatG: 18,
  fiberG: 0,
  estimatedCostPerPortion: 4.5,
  cuisineTags: [],
  dietaryTags: [],
  cookMethodHint: 'pan_sear',
  pantryIngredientNames: [],
  pantryCoveragePercent: 100,
};

const CHICKEN: MealComponent = {
  ...SALMON,
  id: 'chicken',
  name: 'Chicken Thigh',
  estimatedCostPerPortion: 1.5,
};

const TOFU: MealComponent = {
  ...SALMON,
  id: 'tofu',
  name: 'Tofu',
  estimatedCostPerPortion: 0.9,
};

describe('BudgetToggle', () => {
  it('renders toggle pill in OFF state by default', () => {
    const { getByTestId } = render(
      <BudgetToggle
        active={false}
        onToggle={jest.fn()}
        testID="budget-toggle"
      />,
    );
    const btn = getByTestId('budget-toggle');
    expect(btn.props.accessibilityLabel).toMatch(/off/i);
  });

  it('renders toggle pill in ON state when active', () => {
    const { getByTestId } = render(
      <BudgetToggle
        active={true}
        onToggle={jest.fn()}
        testID="budget-toggle"
      />,
    );
    const btn = getByTestId('budget-toggle');
    expect(btn.props.accessibilityLabel).toMatch(/on/i);
  });

  it('calls onToggle on press', async () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <BudgetToggle
        active={false}
        onToggle={onToggle}
        testID="budget-toggle"
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('budget-toggle'));
    });

    expect(onToggle).toHaveBeenCalled();
  });
});

describe('CostPill', () => {
  it('renders dollar amount with currency prefix', () => {
    const { getByText, getByTestId } = render(
      <CostPill totalCost={6.45} testID="cost-pill" />,
    );
    expect(getByTestId('cost-pill')).toBeTruthy();
    expect(getByText(/\$6\.45/)).toBeTruthy();
  });

  it('renders nothing when totalCost is 0', () => {
    const { queryByTestId } = render(
      <CostPill totalCost={0} testID="cost-pill" />,
    );
    expect(queryByTestId('cost-pill')).toBeNull();
  });
});

describe('sortByCost', () => {
  it('sorts components ascending by estimatedCostPerPortion', () => {
    const sorted = sortByCost([SALMON, TOFU, CHICKEN]);
    expect(sorted.map((c) => c.id)).toEqual(['tofu', 'chicken', 'salmon']);
  });

  it('treats undefined cost as Infinity (sorted last)', () => {
    const noCost: MealComponent = { ...SALMON, id: 'mystery', estimatedCostPerPortion: undefined };
    const sorted = sortByCost([noCost, CHICKEN]);
    expect(sorted.map((c) => c.id)).toEqual(['chicken', 'mystery']);
  });
});
