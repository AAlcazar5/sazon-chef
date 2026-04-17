// frontend/__tests__/components/recipe/ScalingPillsRow.test.tsx
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ScalingPillsRow from '../../../components/recipe/ScalingPillsRow';

describe('ScalingPillsRow', () => {
  const defaultProps = {
    activeScale: 1,
    onScaleChange: jest.fn(),
    onCustomPress: jest.fn(),
    onHitMyMacrosPress: jest.fn(),
    isDark: false,
  };

  beforeEach(() => jest.clearAllMocks());

  test('renders all preset pills', () => {
    const { getByText } = render(<ScalingPillsRow {...defaultProps} />);
    expect(getByText('½×')).toBeTruthy();
    expect(getByText('1×')).toBeTruthy();
    expect(getByText('2×')).toBeTruthy();
    expect(getByText('4×')).toBeTruthy();
  });

  test('renders Custom and Hit My Macros pills', () => {
    const { getByText } = render(<ScalingPillsRow {...defaultProps} />);
    expect(getByText('Custom')).toBeTruthy();
    expect(getByText('Hit My Macros')).toBeTruthy();
  });

  test('highlights the active scale pill', () => {
    const { getByLabelText } = render(<ScalingPillsRow {...defaultProps} activeScale={2} />);
    const pill = getByLabelText('Scale to 2× (active)');
    expect(pill).toBeTruthy();
  });

  test('calls onScaleChange when a preset pill is tapped', () => {
    const onScaleChange = jest.fn();
    const { getByText } = render(
      <ScalingPillsRow {...defaultProps} onScaleChange={onScaleChange} />,
    );
    fireEvent.press(getByText('2×'));
    expect(onScaleChange).toHaveBeenCalledWith(2);
  });

  test('calls onCustomPress when Custom pill is tapped', () => {
    const onCustomPress = jest.fn();
    const { getByText } = render(
      <ScalingPillsRow {...defaultProps} onCustomPress={onCustomPress} />,
    );
    fireEvent.press(getByText('Custom'));
    expect(onCustomPress).toHaveBeenCalled();
  });

  test('calls onHitMyMacrosPress when Hit My Macros pill is tapped', () => {
    const onHitMyMacrosPress = jest.fn();
    const { getByText } = render(
      <ScalingPillsRow {...defaultProps} onHitMyMacrosPress={onHitMyMacrosPress} />,
    );
    fireEvent.press(getByText('Hit My Macros'));
    expect(onHitMyMacrosPress).toHaveBeenCalled();
  });

  test('1× is highlighted by default', () => {
    const { getByLabelText } = render(<ScalingPillsRow {...defaultProps} />);
    expect(getByLabelText('Scale to 1× (active)')).toBeTruthy();
  });

  test('supports dark mode', () => {
    const { getByText } = render(<ScalingPillsRow {...defaultProps} isDark />);
    expect(getByText('½×')).toBeTruthy();
  });
});
