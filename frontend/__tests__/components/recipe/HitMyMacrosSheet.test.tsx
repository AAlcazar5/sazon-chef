// frontend/__tests__/components/recipe/HitMyMacrosSheet.test.tsx
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HitMyMacrosSheet from '../../../components/recipe/HitMyMacrosSheet';

describe('HitMyMacrosSheet', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onApply: jest.fn(),
    perServingCalories: 500,
    perServingProtein: 30,
    baseServings: 4,
    isDark: false,
  };

  beforeEach(() => jest.clearAllMocks());

  test('renders when visible', () => {
    const { getByText } = render(<HitMyMacrosSheet {...defaultProps} />);
    expect(getByText('Hit My Macros')).toBeTruthy();
  });

  test('does not render content when not visible', () => {
    const { queryByText } = render(<HitMyMacrosSheet {...defaultProps} visible={false} />);
    expect(queryByText('Hit My Macros')).toBeNull();
  });

  test('shows calorie and protein input fields', () => {
    const { getByPlaceholderText } = render(<HitMyMacrosSheet {...defaultProps} />);
    expect(getByPlaceholderText('e.g. 450')).toBeTruthy();
    expect(getByPlaceholderText('e.g. 35')).toBeTruthy();
  });

  test('calculates preview when calorie target entered', () => {
    const { getByPlaceholderText, getByText } = render(<HitMyMacrosSheet {...defaultProps} />);
    fireEvent.changeText(getByPlaceholderText('e.g. 450'), '250');
    // 250/500 = 0.5 scale → 2.0 servings
    expect(getByText(/2\.0 servings/)).toBeTruthy();
    expect(getByText(/250 cal/)).toBeTruthy();
  });

  test('calculates preview when protein target entered', () => {
    const { getByPlaceholderText, getByText } = render(<HitMyMacrosSheet {...defaultProps} />);
    fireEvent.changeText(getByPlaceholderText('e.g. 35'), '45');
    // 45/30 = 1.5 scale → 6.0 servings
    expect(getByText(/6\.0 servings/)).toBeTruthy();
  });

  test('calls onApply with correct targets', () => {
    const onApply = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <HitMyMacrosSheet {...defaultProps} onApply={onApply} />,
    );
    fireEvent.changeText(getByPlaceholderText('e.g. 450'), '450');
    fireEvent.press(getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith({ targetCalories: 450, targetProtein: undefined });
  });

  test('calls onClose when cancel pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<HitMyMacrosSheet {...defaultProps} onClose={onClose} />);
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  test('Apply is disabled when no targets entered', () => {
    const onApply = jest.fn();
    const { getByText } = render(<HitMyMacrosSheet {...defaultProps} onApply={onApply} />);
    fireEvent.press(getByText('Apply'));
    expect(onApply).not.toHaveBeenCalled();
  });
});
