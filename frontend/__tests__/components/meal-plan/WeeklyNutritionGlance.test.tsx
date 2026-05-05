// frontend/__tests__/components/meal-plan/WeeklyNutritionGlance.test.tsx
// ROADMAP 4.0 Tier A2-e — Weekly nutrition glance (TDD).

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WeeklyNutritionGlance from '../../../components/meal-plan/WeeklyNutritionGlance';

describe('<WeeklyNutritionGlance />', () => {
  it('renders nothing when there are 0 cuisines (no meals planned/cooked)', () => {
    const { queryByTestId } = render(
      <WeeklyNutritionGlance cuisineCount={0} ingredientCount={0} colorCount={0} onPress={jest.fn()} />
    );
    expect(queryByTestId('weekly-nutrition-glance')).toBeNull();
  });

  it('renders the strip when at least one cuisine is present', () => {
    const { getByTestId } = render(
      <WeeklyNutritionGlance cuisineCount={3} ingredientCount={12} colorCount={4} onPress={jest.fn()} />
    );
    expect(getByTestId('weekly-nutrition-glance')).toBeTruthy();
  });

  it('shows cuisine + ingredient + color counts', () => {
    const { getByText } = render(
      <WeeklyNutritionGlance
        cuisineCount={7}
        ingredientCount={28}
        colorCount={6}
        onPress={jest.fn()}
      />
    );
    expect(getByText(/7 cuisines/)).toBeTruthy();
    expect(getByText(/28 ingredients/)).toBeTruthy();
    expect(getByText(/6 colors/)).toBeTruthy();
  });

  it('uses singular wording for a single cuisine', () => {
    const { getByText } = render(
      <WeeklyNutritionGlance cuisineCount={1} ingredientCount={4} colorCount={2} onPress={jest.fn()} />
    );
    expect(getByText(/1 cuisine /)).toBeTruthy();
  });

  it('renders crushing-text when crushingNutrient is provided', () => {
    const { getByText } = render(
      <WeeklyNutritionGlance
        cuisineCount={3}
        ingredientCount={12}
        colorCount={4}
        crushingNutrient="magnesium"
        onPress={jest.fn()}
      />
    );
    expect(getByText(/Crushing magnesium/i)).toBeTruthy();
  });

  it('omits crushing-text when not provided', () => {
    const { queryByText } = render(
      <WeeklyNutritionGlance cuisineCount={3} ingredientCount={12} colorCount={4} onPress={jest.fn()} />
    );
    expect(queryByText(/Crushing/i)).toBeNull();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <WeeklyNutritionGlance cuisineCount={3} ingredientCount={12} colorCount={4} onPress={onPress} />
    );
    fireEvent.press(getByTestId('weekly-nutrition-glance'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes an accessibilityLabel that summarises the week', () => {
    const { getByLabelText } = render(
      <WeeklyNutritionGlance
        cuisineCount={7}
        ingredientCount={28}
        colorCount={6}
        crushingNutrient="magnesium"
        onPress={jest.fn()}
      />
    );
    expect(getByLabelText(/this week.*7 cuisines.*28 ingredients/i)).toBeTruthy();
  });
});
