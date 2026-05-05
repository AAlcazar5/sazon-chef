// frontend/__tests__/components/today/NutritionDiscoveryStrip.test.tsx
// ROADMAP 4.0 Tier A1-b — Today nutrition discovery strip (TDD).

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
import NutritionDiscoveryStrip from '../../../components/today/NutritionDiscoveryStrip';

describe('<NutritionDiscoveryStrip />', () => {
  it('renders nothing when there are no signals (cuisineCount=0)', () => {
    const { queryByTestId } = render(
      <NutritionDiscoveryStrip
        cuisineCount={0}
        ingredientCount={0}
        colorCount={0}
        topMineral={null}
        onPress={jest.fn()}
      />
    );
    expect(queryByTestId('nutrition-discovery-strip')).toBeNull();
  });

  it('renders the strip when there is at least 1 cuisine', () => {
    const { getByTestId } = render(
      <NutritionDiscoveryStrip
        cuisineCount={2}
        ingredientCount={6}
        colorCount={3}
        topMineral={null}
        onPress={jest.fn()}
      />
    );
    expect(getByTestId('nutrition-discovery-strip')).toBeTruthy();
  });

  it('shows yesterday eyebrow', () => {
    const { getByText } = render(
      <NutritionDiscoveryStrip
        cuisineCount={4}
        ingredientCount={18}
        colorCount={6}
        topMineral={null}
        onPress={jest.fn()}
      />
    );
    expect(getByText(/YESTERDAY/i)).toBeTruthy();
  });

  it('shows cuisine + ingredient + color counts', () => {
    const { getByText } = render(
      <NutritionDiscoveryStrip
        cuisineCount={4}
        ingredientCount={18}
        colorCount={6}
        topMineral={null}
        onPress={jest.fn()}
      />
    );
    expect(getByText(/4 cuisines/)).toBeTruthy();
    expect(getByText(/18 ingredients/)).toBeTruthy();
    expect(getByText(/6 colors/)).toBeTruthy();
  });

  it('uses singular wording for 1 cuisine', () => {
    const { getByText } = render(
      <NutritionDiscoveryStrip
        cuisineCount={1}
        ingredientCount={5}
        colorCount={2}
        topMineral={null}
        onPress={jest.fn()}
      />
    );
    expect(getByText(/1 cuisine /)).toBeTruthy();
  });

  it('appends top mineral line when provided', () => {
    const { getByText } = render(
      <NutritionDiscoveryStrip
        cuisineCount={4}
        ingredientCount={18}
        colorCount={6}
        topMineral="magnesium"
        onPress={jest.fn()}
      />
    );
    expect(getByText(/top mineral.*magnesium/i)).toBeTruthy();
  });

  it('omits top mineral line when null', () => {
    const { queryByText } = render(
      <NutritionDiscoveryStrip
        cuisineCount={4}
        ingredientCount={18}
        colorCount={6}
        topMineral={null}
        onPress={jest.fn()}
      />
    );
    expect(queryByText(/top mineral/i)).toBeNull();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <NutritionDiscoveryStrip
        cuisineCount={4}
        ingredientCount={18}
        colorCount={6}
        topMineral="magnesium"
        onPress={onPress}
      />
    );
    fireEvent.press(getByTestId('nutrition-discovery-strip'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes accessibilityLabel summarising yesterday', () => {
    const { getByLabelText } = render(
      <NutritionDiscoveryStrip
        cuisineCount={4}
        ingredientCount={18}
        colorCount={6}
        topMineral="magnesium"
        onPress={jest.fn()}
      />
    );
    expect(getByLabelText(/yesterday.*4 cuisines.*magnesium/i)).toBeTruthy();
  });
});
