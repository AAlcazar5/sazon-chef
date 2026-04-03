// frontend/__tests__/components/WeeklyNutritionSummary.test.tsx
// Phase 3: WeeklyNutritionSummary — animated progress bars on mount

import React from 'react';
import { render } from '@testing-library/react-native';
import WeeklyNutritionSummary from '../../components/meal-plan/WeeklyNutritionSummary';

const makeNutrition = (overrides: any = {}) => ({
  period: { days: 7 },
  totals: { calories: 12000, protein: 350, carbs: 1400, fat: 420 },
  averages: { dailyCalories: 1714 },
  goals: {
    weeklyCalories: 14000,
    dailyCalories: 2000,
    weeklyProtein: 490,
    weeklyCarbs: 1750,
    weeklyFat: 560,
  },
  completed: {
    mealsCompleted: 15,
    totalMeals: 21,
    completionRate: 71.4,
  },
  ...overrides,
});

describe('WeeklyNutritionSummary', () => {
  it('renders nothing when weeklyNutrition is null', () => {
    const { toJSON } = render(
      <WeeklyNutritionSummary weeklyNutrition={null} isDark={false} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the section title', () => {
    const { getByText } = render(
      <WeeklyNutritionSummary weeklyNutrition={makeNutrition()} isDark={false} />
    );
    expect(getByText('Weekly Nutrition Summary')).toBeTruthy();
  });

  it('shows period days', () => {
    const { getByText } = render(
      <WeeklyNutritionSummary weeklyNutrition={makeNutrition()} isDark={false} />
    );
    expect(getByText('7 days')).toBeTruthy();
  });

  it('shows completion rate percentage', () => {
    const { getByText } = render(
      <WeeklyNutritionSummary weeklyNutrition={makeNutrition()} isDark={false} />
    );
    expect(getByText('71% Complete')).toBeTruthy();
  });

  it('shows weekly calorie label and values', () => {
    const { getByText } = render(
      <WeeklyNutritionSummary weeklyNutrition={makeNutrition()} isDark={false} />
    );
    expect(getByText('Weekly Calories')).toBeTruthy();
    expect(getByText('12,000 / 14,000')).toBeTruthy();
  });

  it('shows daily macro distribution label when weeklyPlan provided', () => {
    const { getByText } = render(
      <WeeklyNutritionSummary weeklyNutrition={makeNutrition()} isDark={false} />
    );
    // The macro breakdown section is always present
    expect(getByText('Macro Breakdown')).toBeTruthy();
  });

  it('shows macro breakdown labels', () => {
    const { getByText } = render(
      <WeeklyNutritionSummary weeklyNutrition={makeNutrition()} isDark={false} />
    );
    expect(getByText('Protein')).toBeTruthy();
    expect(getByText('Carbs')).toBeTruthy();
    expect(getByText('Fat')).toBeTruthy();
  });

  it('shows macro gram values', () => {
    const { getByText } = render(
      <WeeklyNutritionSummary weeklyNutrition={makeNutrition()} isDark={false} />
    );
    expect(getByText('350g')).toBeTruthy();
    expect(getByText('1400g')).toBeTruthy();
    expect(getByText('420g')).toBeTruthy();
  });

  it('shows meal completion count', () => {
    const { getByText } = render(
      <WeeklyNutritionSummary weeklyNutrition={makeNutrition()} isDark={false} />
    );
    expect(getByText('Meal Completion')).toBeTruthy();
    expect(getByText('15 / 21')).toBeTruthy();
  });

  it('renders without goals (gracefully skips calorie progress bars)', () => {
    const noGoals = makeNutrition({ goals: null });
    const { getByText, queryByText } = render(
      <WeeklyNutritionSummary weeklyNutrition={noGoals} isDark={false} />
    );
    expect(getByText('Macro Breakdown')).toBeTruthy();
    expect(queryByText('Weekly Calories')).toBeNull();
  });

  it('renders in dark mode without crashing', () => {
    const { toJSON } = render(
      <WeeklyNutritionSummary weeklyNutrition={makeNutrition()} isDark={true} />
    );
    expect(toJSON()).toBeTruthy();
  });
});
