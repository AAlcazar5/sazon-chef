// frontend/__tests__/components/WidgetCard.test.tsx
// Tests for WidgetCard pastel-tinted stat card component (9L)

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WidgetCard from '../../components/ui/WidgetCard';
import { Pastel, PastelDark } from '../../constants/Colors';

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('WidgetCard', () => {
  it('renders with correct tint, stat, and label', () => {
    const { getByText, getByTestId } = render(
      <WidgetCard
        tint={Pastel.sage}
        icon="🥩"
        statValue={120}
        statUnit="g"
        label="Protein"
        testID="widget-protein"
      />
    );
    expect(getByTestId('widget-protein')).toBeTruthy();
    expect(getByText('120')).toBeTruthy();
    expect(getByText('g')).toBeTruthy();
    expect(getByText('Protein')).toBeTruthy();
    expect(getByText('🥩')).toBeTruthy();
  });

  it('renders trend arrow when provided', () => {
    const { getByText } = render(
      <WidgetCard
        tint={Pastel.golden}
        icon="🌾"
        statValue={200}
        label="Carbs"
        trend={{ value: '+5%', direction: 'up' }}
      />
    );
    expect(getByText('↑')).toBeTruthy();
    expect(getByText('+5%')).toBeTruthy();
  });

  it('renders down trend correctly', () => {
    const { getByText } = render(
      <WidgetCard
        tint={Pastel.lavender}
        icon="🥑"
        statValue={60}
        label="Fat"
        trend={{ value: '-3%', direction: 'down' }}
      />
    );
    expect(getByText('↓')).toBeTruthy();
    expect(getByText('-3%')).toBeTruthy();
  });

  it('fires onPress when provided', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <WidgetCard
        tint={Pastel.peach}
        icon="🔥"
        statValue={1800}
        statUnit="kcal"
        label="Calories"
        onPress={onPress}
        testID="widget-calories"
      />
    );
    fireEvent.press(getByTestId('widget-calories'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without onPress (non-tappable)', () => {
    const { getByTestId } = render(
      <WidgetCard
        tint={Pastel.sage}
        icon="📚"
        statValue={42}
        label="Saved"
        testID="widget-saved"
      />
    );
    expect(getByTestId('widget-saved')).toBeTruthy();
  });

  it('supports string statValue', () => {
    const { getByText } = render(
      <WidgetCard
        tint={Pastel.sky}
        icon="⏱"
        statValue="32 min"
        label="Cook Time"
      />
    );
    expect(getByText('32 min')).toBeTruthy();
  });

  it('has correct accessibility label', () => {
    const { getByTestId } = render(
      <WidgetCard
        tint={Pastel.sage}
        icon="🥩"
        statValue={120}
        statUnit="g"
        label="Protein"
        testID="widget-protein"
      />
    );
    expect(getByTestId('widget-protein').props.accessibilityLabel).toBe('Protein: 120g');
  });
});
