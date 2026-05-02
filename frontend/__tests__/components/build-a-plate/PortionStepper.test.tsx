// frontend/__tests__/components/build-a-plate/PortionStepper.test.tsx
// Group 10X Phase 5 — Portion stepper (×0.5/×1/×1.5/×2) per component.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import PortionStepper from '../../../components/build-a-plate/PortionStepper';

describe('PortionStepper', () => {
  it('renders the four standard multiplier chips', () => {
    const { getByTestId } = render(
      <PortionStepper
        value={1}
        onChange={jest.fn()}
        testID="portion-stepper"
      />,
    );
    expect(getByTestId('portion-stepper-chip-0.5')).toBeTruthy();
    expect(getByTestId('portion-stepper-chip-1')).toBeTruthy();
    expect(getByTestId('portion-stepper-chip-1.5')).toBeTruthy();
    expect(getByTestId('portion-stepper-chip-2')).toBeTruthy();
  });

  it('marks the active chip when value matches', () => {
    const { getByTestId } = render(
      <PortionStepper
        value={1.5}
        onChange={jest.fn()}
        testID="portion-stepper"
      />,
    );
    const active = getByTestId('portion-stepper-chip-1.5');
    expect(active.props.accessibilityLabel).toMatch(/selected/i);
  });

  it('calls onChange with the selected multiplier', async () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PortionStepper
        value={1}
        onChange={onChange}
        testID="portion-stepper"
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('portion-stepper-chip-2'));
    });

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('does not re-emit onChange when active chip is tapped again', async () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PortionStepper
        value={1}
        onChange={onChange}
        testID="portion-stepper"
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('portion-stepper-chip-1'));
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
