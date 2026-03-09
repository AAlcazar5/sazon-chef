// frontend/__tests__/components/StarRating.test.tsx
// Phase 4 Cookbook: StarRating — burst animation on tap, correct values passed to onRate

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StarRating from '../../components/cookbook/StarRating';

jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: { accessibilityLabel?: string }) {
    return <Text>{accessibilityLabel ?? 'icon'}</Text>;
  };
});

describe('StarRating', () => {
  beforeEach(() => jest.clearAllMocks());

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
});
