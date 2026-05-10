// frontend/__tests__/components/build-a-plate/KeepUnderSheet.test.tsx
// "Keep under" cap-picker sheet — 5 toggleable rows, defaults from daily macros.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, colors: { background: '#FFFFFF' } }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

// Mock the BottomSheet wrapper to render children inline so the test can
// interact with rows without dealing with @gorhom internals.
jest.mock('../../../components/ui/BottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ visible, children }: any) => (visible ? <View>{children}</View> : null);
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import KeepUnderSheet from '../../../components/build-a-plate/KeepUnderSheet';

describe('KeepUnderSheet', () => {
  it('renders all five toggleable rows (calories, protein, carbs, fat, fiber)', () => {
    const { getByTestId } = render(
      <KeepUnderSheet visible onClose={jest.fn()} onApply={jest.fn()} />,
    );
    expect(getByTestId('keep-under-row-calories')).toBeTruthy();
    expect(getByTestId('keep-under-row-protein')).toBeTruthy();
    expect(getByTestId('keep-under-row-carbs')).toBeTruthy();
    expect(getByTestId('keep-under-row-fat')).toBeTruthy();
    expect(getByTestId('keep-under-row-fiber')).toBeTruthy();
  });

  it('seeds inputs with 1/3 of daily macro goals (rounded)', () => {
    const { getByTestId } = render(
      <KeepUnderSheet
        visible
        onClose={jest.fn()}
        onApply={jest.fn()}
        dailyDefaults={{ calories: 2100, protein: 150, carbs: 240, fat: 70, fiber: 30 }}
      />,
    );
    // 2100 / 3 = 700; 150 / 3 = 50; 240 / 3 = 80; 70 / 3 ≈ 23; 30 / 3 = 10
    expect((getByTestId('keep-under-input-calories') as any).props.value).toBe('700');
    expect((getByTestId('keep-under-input-protein') as any).props.value).toBe('50');
    expect((getByTestId('keep-under-input-carbs') as any).props.value).toBe('80');
    expect((getByTestId('keep-under-input-fat') as any).props.value).toBe('23');
    expect((getByTestId('keep-under-input-fiber') as any).props.value).toBe('10');
  });

  it('disables the Apply button when no row is enabled', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <KeepUnderSheet visible onClose={jest.fn()} onApply={onApply} />,
    );
    fireEvent.press(getByTestId('keep-under-apply'));
    expect(onApply).not.toHaveBeenCalled();
  });

  it('calls onApply with only the enabled caps', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <KeepUnderSheet
        visible
        onClose={jest.fn()}
        onApply={onApply}
        dailyDefaults={{ calories: 1800, protein: 120, carbs: 200, fat: 60, fiber: 30 }}
      />,
    );
    // Enable calories + fiber, leave the others off.
    fireEvent(getByTestId('keep-under-switch-calories'), 'valueChange', true);
    fireEvent(getByTestId('keep-under-switch-fiber'), 'valueChange', true);
    fireEvent.press(getByTestId('keep-under-apply'));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toEqual({ calories: 600, fiber: 10 });
  });

  it('uses the latest typed value when the user overrides the default', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <KeepUnderSheet
        visible
        onClose={jest.fn()}
        onApply={onApply}
        dailyDefaults={{ calories: 1800 }}
      />,
    );
    fireEvent(getByTestId('keep-under-switch-calories'), 'valueChange', true);
    fireEvent.changeText(getByTestId('keep-under-input-calories'), '450');
    fireEvent.press(getByTestId('keep-under-apply'));
    expect(onApply.mock.calls[0][0]).toEqual({ calories: 450 });
  });

  it('strips non-numeric characters from input', () => {
    const { getByTestId } = render(
      <KeepUnderSheet
        visible
        onClose={jest.fn()}
        onApply={jest.fn()}
        dailyDefaults={{ calories: 1800 }}
      />,
    );
    fireEvent(getByTestId('keep-under-switch-calories'), 'valueChange', true);
    fireEvent.changeText(getByTestId('keep-under-input-calories'), '5o0abc');
    expect((getByTestId('keep-under-input-calories') as any).props.value).toBe('50');
  });
});
