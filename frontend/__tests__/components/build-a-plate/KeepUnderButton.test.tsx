// frontend/__tests__/components/build-a-plate/KeepUnderButton.test.tsx
// "Keep under" pill: blue idle, green fit, peach impossible.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import KeepUnderButton from '../../../components/build-a-plate/KeepUnderButton';

describe('KeepUnderButton', () => {
  it('renders idle state with "Keep under…" label', () => {
    const { getByTestId, getByText } = render(
      <KeepUnderButton state="idle" onPress={jest.fn()} testID="keep-under-btn" />,
    );
    expect(getByTestId('keep-under-btn')).toBeTruthy();
    expect(getByText(/Keep under/i)).toBeTruthy();
  });

  it('renders "fit" state with the under-caps label', () => {
    const { getByText } = render(
      <KeepUnderButton state="fit" onPress={jest.fn()} testID="keep-under-btn" />,
    );
    expect(getByText(/Under your caps/i)).toBeTruthy();
  });

  it('renders "impossible" state with the cannot-stay-under label', () => {
    const { getByText } = render(
      <KeepUnderButton state="impossible" onPress={jest.fn()} testID="keep-under-btn" />,
    );
    expect(getByText(/Cannot stay under/i)).toBeTruthy();
  });

  it('shows the loading pulse element when state="loading"', () => {
    const { getByTestId } = render(
      <KeepUnderButton state="loading" onPress={jest.fn()} testID="keep-under-btn" />,
    );
    expect(getByTestId('keep-under-btn-loading')).toBeTruthy();
  });

  it('fires onPress when tapped from idle', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <KeepUnderButton state="idle" onPress={onPress} testID="keep-under-btn" />,
    );
    fireEvent.press(getByTestId('keep-under-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress while loading (prevents double-fire)', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <KeepUnderButton state="loading" onPress={onPress} testID="keep-under-btn" />,
    );
    fireEvent.press(getByTestId('keep-under-btn'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
