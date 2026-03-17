// frontend/__tests__/components/StarRating.test.tsx
// Phase 4 Cookbook / Phase 6 Haptic Choreography:
// StarRating — burst animation on tap, correct values passed to onRate,
// choreographed haptic sequence fires on star press

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StarRating from '../../components/cookbook/StarRating';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import * as Haptics from 'expo-haptics';
const impact = Haptics.impactAsync as jest.Mock;

jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: { accessibilityLabel?: string }) {
    return <Text>{accessibilityLabel ?? 'icon'}</Text>;
  };
});

describe('StarRating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders 5 stars', () => {
    const { getAllByText } = render(<StarRating rating={null} />);
    // Each star renders its accessibilityLabel text (1 star, 2 stars, ...)
    expect(getAllByText(/star/i)).toHaveLength(5);
  });

  it('calls onRate with correct value when a star is tapped', () => {
    const onRate = jest.fn();
    const { getByText } = render(<StarRating rating={null} onRate={onRate} />);
    fireEvent.press(getByText('Rate 3 stars'));
    expect(onRate).toHaveBeenCalledWith(3);
  });

  it('calls onRate with null when tapping the current rating (toggle off)', () => {
    const onRate = jest.fn();
    const { getByText } = render(<StarRating rating={3} onRate={onRate} />);
    fireEvent.press(getByText('Rate 3 stars'));
    expect(onRate).toHaveBeenCalledWith(null);
  });

  it('calls onRate with 5 for a 5-star tap', () => {
    const onRate = jest.fn();
    const { getByText } = render(<StarRating rating={null} onRate={onRate} />);
    fireEvent.press(getByText('Rate 5 stars'));
    expect(onRate).toHaveBeenCalledWith(5);
  });

  it('calls onRate with 1 for a 1-star tap', () => {
    const onRate = jest.fn();
    const { getByText } = render(<StarRating rating={null} onRate={onRate} />);
    fireEvent.press(getByText('Rate 1 star'));
    expect(onRate).toHaveBeenCalledWith(1);
  });

  it('does not call onRate when readonly=true', () => {
    const onRate = jest.fn();
    // readonly renders plain Icon, not HapticTouchableOpacity — no press handler
    const { toJSON } = render(<StarRating rating={3} onRate={onRate} readonly />);
    expect(toJSON()).toBeTruthy();
    expect(onRate).not.toHaveBeenCalled();
  });

  it('renders without crashing in dark mode', () => {
    const { toJSON } = render(<StarRating rating={4} isDark />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders all 3 size variants without crash', () => {
    expect(render(<StarRating rating={null} size="sm" />).toJSON()).toBeTruthy();
    expect(render(<StarRating rating={null} size="md" />).toJSON()).toBeTruthy();
    expect(render(<StarRating rating={null} size="lg" />).toJSON()).toBeTruthy();
  });

  // --- Phase 6: Haptic Choreography ---

  it('fires haptic impacts when a star is pressed (choreographed burst)', () => {
    const onRate = jest.fn();
    const { getByText } = render(<StarRating rating={null} onRate={onRate} />);
    fireEvent.press(getByText('Rate 3 stars'));
    jest.runAllTimers();
    // starBurst(3) → 2 light + 1 medium = 3 impacts total
    expect(impact).toHaveBeenCalledTimes(3);
  });

  it('fires fewer impacts for a 1-star tap (just 1 medium)', () => {
    const onRate = jest.fn();
    const { getByText } = render(<StarRating rating={null} onRate={onRate} />);
    fireEvent.press(getByText('Rate 1 star'));
    jest.runAllTimers();
    // starBurst(1) → 0 lights + 1 medium
    expect(impact).toHaveBeenCalledTimes(1);
    expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('fires 2 light taps when tapping currently selected star (starClear)', () => {
    const onRate = jest.fn();
    const { getByText } = render(<StarRating rating={4} onRate={onRate} />);
    fireEvent.press(getByText('Rate 4 stars'));
    jest.runAllTimers();
    // starClear → 2 light taps
    expect(impact).toHaveBeenCalledTimes(2);
    expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('does not fire haptics in readonly mode', () => {
    const { toJSON } = render(<StarRating rating={3} readonly />);
    expect(toJSON()).toBeTruthy();
    jest.runAllTimers();
    expect(impact).not.toHaveBeenCalled();
  });
});
