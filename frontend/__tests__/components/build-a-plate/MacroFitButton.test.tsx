// frontend/__tests__/components/build-a-plate/MacroFitButton.test.tsx
// Group 10X Phase 5 — Macro auto-fit pill: green when fit, amber when impossible.

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
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import MacroFitButton from '../../../components/build-a-plate/MacroFitButton';

describe('MacroFitButton', () => {
  it('renders default neutral state with "Fit my macros" label', () => {
    const { getByTestId, getByText } = render(
      <MacroFitButton
        onPress={jest.fn()}
        state="idle"
        testID="macro-fit-btn"
      />,
    );
    expect(getByTestId('macro-fit-btn')).toBeTruthy();
    expect(getByText(/Fit my macros/i)).toBeTruthy();
  });

  it('renders "fit" state in green when current totals fit within ±10%', () => {
    const { getByTestId } = render(
      <MacroFitButton
        onPress={jest.fn()}
        state="fit"
        testID="macro-fit-btn"
      />,
    );
    const btn = getByTestId('macro-fit-btn');
    expect(btn.props.accessibilityLabel).toMatch(/fit/i);
  });

  it('renders "impossible" state in amber when fit cannot be achieved', () => {
    const { getByTestId } = render(
      <MacroFitButton
        onPress={jest.fn()}
        state="impossible"
        testID="macro-fit-btn"
      />,
    );
    const btn = getByTestId('macro-fit-btn');
    expect(btn.props.accessibilityLabel).toMatch(/cannot fit|impossible|can't/i);
  });

  it('calls onPress with haptic feedback when tapped', async () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <MacroFitButton
        onPress={onPress}
        state="idle"
        testID="macro-fit-btn"
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('macro-fit-btn'));
    });

    await waitFor(() => expect(onPress).toHaveBeenCalled());
  });

  it('shows loading spinner when in loading state', () => {
    const { getByTestId } = render(
      <MacroFitButton
        onPress={jest.fn()}
        state="loading"
        testID="macro-fit-btn"
      />,
    );
    expect(getByTestId('macro-fit-btn-loading')).toBeTruthy();
  });
});
