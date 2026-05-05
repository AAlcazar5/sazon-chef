// frontend/__tests__/components/meal-plan/ShopThisWeekPill.test.tsx
// ROADMAP 4.0 Tier A2-b — Shop this week pill (TDD).
//
// The pill renders header-right on Meal Plan / Week tab when ≥1 unscheduled
// meal needs ingredients beyond pantry. Tap → opens the existing in-store
// shopping flow.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    isDark: false,
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
import ShopThisWeekPill from '../../../components/meal-plan/ShopThisWeekPill';

describe('<ShopThisWeekPill />', () => {
  it('renders nothing when missingCount is 0', () => {
    const onPress = jest.fn();
    const { queryByTestId } = render(
      <ShopThisWeekPill missingCount={0} onPress={onPress} />
    );
    expect(queryByTestId('shop-this-week-pill')).toBeNull();
  });

  it('renders nothing when missingCount is negative', () => {
    const onPress = jest.fn();
    const { queryByTestId } = render(
      <ShopThisWeekPill missingCount={-1} onPress={onPress} />
    );
    expect(queryByTestId('shop-this-week-pill')).toBeNull();
  });

  it('renders the pill when missingCount >= 1', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ShopThisWeekPill missingCount={1} onPress={onPress} />
    );
    expect(getByTestId('shop-this-week-pill')).toBeTruthy();
  });

  it('shows the missing-ingredient count in the label', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ShopThisWeekPill missingCount={4} onPress={onPress} />
    );
    expect(getByText(/4/)).toBeTruthy();
  });

  it('uses singular wording when missingCount === 1', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ShopThisWeekPill missingCount={1} onPress={onPress} />
    );
    expect(getByText(/Shop · 1 item/)).toBeTruthy();
  });

  it('uses plural wording when missingCount > 1', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ShopThisWeekPill missingCount={5} onPress={onPress} />
    );
    expect(getByText(/Shop · 5 items/)).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ShopThisWeekPill missingCount={3} onPress={onPress} />
    );
    fireEvent.press(getByTestId('shop-this-week-pill'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes an accessibilityLabel that includes the count', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <ShopThisWeekPill missingCount={3} onPress={onPress} />
    );
    expect(getByLabelText(/Shop this week.*3.*item/i)).toBeTruthy();
  });

  it('reports accessibilityRole="button"', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ShopThisWeekPill missingCount={2} onPress={onPress} />
    );
    expect(getByTestId('shop-this-week-pill').props.accessibilityRole).toBe('button');
  });

  it('caps the visible count at 99+ to keep the pill compact', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ShopThisWeekPill missingCount={150} onPress={onPress} />
    );
    expect(getByText(/99\+/)).toBeTruthy();
  });
});
