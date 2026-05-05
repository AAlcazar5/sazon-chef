// frontend/__tests__/components/meal-plan/PantryInlineStrip.test.tsx
// ROADMAP 4.0 Tier A2-c — Pantry inline strip (TDD).

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
import PantryInlineStrip from '../../../components/meal-plan/PantryInlineStrip';

describe('<PantryInlineStrip />', () => {
  it('renders nothing when itemCount is 0', () => {
    const { queryByTestId } = render(
      <PantryInlineStrip itemCount={0} expiringSoonCount={0} onPress={jest.fn()} />
    );
    expect(queryByTestId('pantry-inline-strip')).toBeNull();
  });

  it('renders the strip when itemCount >= 1', () => {
    const { getByTestId } = render(
      <PantryInlineStrip itemCount={23} expiringSoonCount={0} onPress={jest.fn()} />
    );
    expect(getByTestId('pantry-inline-strip')).toBeTruthy();
  });

  it('shows item count using singular wording for 1', () => {
    const { getByText } = render(
      <PantryInlineStrip itemCount={1} expiringSoonCount={0} onPress={jest.fn()} />
    );
    expect(getByText(/Pantry · 1 ingredient$/)).toBeTruthy();
  });

  it('shows item count using plural wording for >1', () => {
    const { getByText } = render(
      <PantryInlineStrip itemCount={23} expiringSoonCount={0} onPress={jest.fn()} />
    );
    expect(getByText(/Pantry · 23 ingredients$/)).toBeTruthy();
  });

  it('appends expiring count when expiringSoonCount > 0', () => {
    const { getByText } = render(
      <PantryInlineStrip itemCount={23} expiringSoonCount={4} onPress={jest.fn()} />
    );
    expect(getByText(/Pantry · 23 ingredients · 4 expiring/)).toBeTruthy();
  });

  it('uses singular "1 expiring" when expiringSoonCount === 1', () => {
    const { getByText } = render(
      <PantryInlineStrip itemCount={10} expiringSoonCount={1} onPress={jest.fn()} />
    );
    expect(getByText(/1 expiring/)).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PantryInlineStrip itemCount={5} expiringSoonCount={0} onPress={onPress} />
    );
    fireEvent.press(getByTestId('pantry-inline-strip'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes an accessibilityLabel describing pantry state', () => {
    const { getByLabelText } = render(
      <PantryInlineStrip itemCount={23} expiringSoonCount={4} onPress={jest.fn()} />
    );
    expect(getByLabelText(/pantry.*23.*4 expiring/i)).toBeTruthy();
  });

  it('reports accessibilityRole="button"', () => {
    const { getByTestId } = render(
      <PantryInlineStrip itemCount={5} expiringSoonCount={0} onPress={jest.fn()} />
    );
    expect(getByTestId('pantry-inline-strip').props.accessibilityRole).toBe('button');
  });
});
