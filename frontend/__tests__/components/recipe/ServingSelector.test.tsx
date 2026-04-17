// frontend/__tests__/components/recipe/ServingSelector.test.tsx
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ServingSelector from '../../../components/recipe/ServingSelector';

describe('ServingSelector', () => {
  const defaultProps = {
    servings: 4,
    baseServings: 4,
    onServingsChange: jest.fn(),
    onHitMyMacrosPress: jest.fn(),
    isDark: false,
  };

  beforeEach(() => jest.clearAllMocks());

  test('displays current serving count', () => {
    const { getByLabelText } = render(<ServingSelector {...defaultProps} />);
    expect(getByLabelText('4 servings')).toBeTruthy();
  });

  test('minus button decreases by 0.5', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <ServingSelector {...defaultProps} onServingsChange={onChange} />,
    );
    fireEvent.press(getByLabelText('Decrease servings'));
    expect(onChange).toHaveBeenCalledWith(3.5);
  });

  test('plus button increases by 0.5', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <ServingSelector {...defaultProps} onServingsChange={onChange} />,
    );
    fireEvent.press(getByLabelText('Increase servings'));
    expect(onChange).toHaveBeenCalledWith(4.5);
  });

  test('does not go below 0.5', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <ServingSelector {...defaultProps} servings={0.5} onServingsChange={onChange} />,
    );
    fireEvent.press(getByLabelText('Decrease servings'));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('renders tick marks for whole numbers', () => {
    const { getByLabelText } = render(<ServingSelector {...defaultProps} />);
    expect(getByLabelText('Set to 1 serving')).toBeTruthy();
    expect(getByLabelText('Set to 2 servings')).toBeTruthy();
    expect(getByLabelText('Set to 4 servings (active)')).toBeTruthy(); // 4 is current
    expect(getByLabelText('Set to 8 servings')).toBeTruthy();
  });

  test('tapping a tick mark sets servings to that value', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <ServingSelector {...defaultProps} onServingsChange={onChange} />,
    );
    fireEvent.press(getByLabelText('Set to 6 servings'));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  test('highlights the active tick', () => {
    const { getByLabelText } = render(<ServingSelector {...defaultProps} servings={2} />);
    // Active tick should exist with (active) label
    expect(getByLabelText('Set to 2 servings (active)')).toBeTruthy();
  });

  test('shows Hit My Macros button', () => {
    const { getByText } = render(<ServingSelector {...defaultProps} />);
    expect(getByText('Hit My Macros')).toBeTruthy();
  });

  test('calls onHitMyMacrosPress when pressed', () => {
    const onHit = jest.fn();
    const { getByText } = render(
      <ServingSelector {...defaultProps} onHitMyMacrosPress={onHit} />,
    );
    fireEvent.press(getByText('Hit My Macros'));
    expect(onHit).toHaveBeenCalled();
  });

  test('displays half servings correctly', () => {
    const { getByLabelText } = render(<ServingSelector {...defaultProps} servings={3.5} />);
    expect(getByLabelText('3.5 servings')).toBeTruthy();
  });

  test('supports dark mode', () => {
    const { getByLabelText } = render(<ServingSelector {...defaultProps} isDark />);
    expect(getByLabelText('4 servings')).toBeTruthy();
  });
});
