// frontend/__tests__/components/build-a-plate/KeepUnderSheet.test.tsx
// "Tune the plate" sheet — 5 toggleable rows, each with min/max mode and a value.

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

  it('seeds calories to 650 regardless of daily defaults (per-meal override)', () => {
    const { getByTestId } = render(
      <KeepUnderSheet
        visible
        onClose={jest.fn()}
        onApply={jest.fn()}
        dailyDefaults={{ calories: 2400 }}
      />,
    );
    expect((getByTestId('keep-under-input-calories') as any).props.value).toBe('650');
  });

  it('seeds non-calorie inputs with 1/3 of daily macro goals (rounded)', () => {
    const { getByTestId } = render(
      <KeepUnderSheet
        visible
        onClose={jest.fn()}
        onApply={jest.fn()}
        dailyDefaults={{ calories: 2100, protein: 150, carbs: 240, fat: 70, fiber: 30 }}
      />,
    );
    expect((getByTestId('keep-under-input-protein') as any).props.value).toBe('50');
    expect((getByTestId('keep-under-input-carbs') as any).props.value).toBe('80');
    expect((getByTestId('keep-under-input-fat') as any).props.value).toBe('23');
    expect((getByTestId('keep-under-input-fiber') as any).props.value).toBe('10');
  });

  it('disables Apply when no row is enabled', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <KeepUnderSheet visible onClose={jest.fn()} onApply={onApply} />,
    );
    fireEvent.press(getByTestId('keep-under-apply'));
    expect(onApply).not.toHaveBeenCalled();
  });

  it('emits a max bound when calories row is enabled in default mode', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <KeepUnderSheet visible onClose={jest.fn()} onApply={onApply} />,
    );
    fireEvent(getByTestId('keep-under-switch-calories'), 'valueChange', true);
    fireEvent.press(getByTestId('keep-under-apply'));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toEqual({ calories: { max: 650 } });
  });

  it('emits a min bound when protein row is enabled (default mode for protein is min)', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <KeepUnderSheet
        visible
        onClose={jest.fn()}
        onApply={onApply}
        dailyDefaults={{ protein: 120 }}
      />,
    );
    fireEvent(getByTestId('keep-under-switch-protein'), 'valueChange', true);
    fireEvent.press(getByTestId('keep-under-apply'));
    expect(onApply.mock.calls[0][0]).toEqual({ protein: { min: 40 } });
  });

  it('switches mode from min to max for protein when user taps the ≤ chip', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <KeepUnderSheet
        visible
        onClose={jest.fn()}
        onApply={onApply}
        dailyDefaults={{ protein: 120 }}
      />,
    );
    fireEvent(getByTestId('keep-under-switch-protein'), 'valueChange', true);
    fireEvent.press(getByTestId('keep-under-mode-max-protein'));
    fireEvent.press(getByTestId('keep-under-apply'));
    expect(onApply.mock.calls[0][0]).toEqual({ protein: { max: 40 } });
  });

  it('emits multiple bounds when several rows are enabled (mixed min/max)', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <KeepUnderSheet
        visible
        onClose={jest.fn()}
        onApply={onApply}
        dailyDefaults={{ protein: 120, fiber: 30 }}
      />,
    );
    fireEvent(getByTestId('keep-under-switch-calories'), 'valueChange', true);
    fireEvent(getByTestId('keep-under-switch-protein'), 'valueChange', true);
    fireEvent(getByTestId('keep-under-switch-fiber'), 'valueChange', true);
    fireEvent.press(getByTestId('keep-under-apply'));

    expect(onApply.mock.calls[0][0]).toEqual({
      calories: { max: 650 },
      protein: { min: 40 },
      fiber: { min: 10 },
    });
  });

  it('uses the latest typed value when the user overrides the default', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <KeepUnderSheet
        visible
        onClose={jest.fn()}
        onApply={onApply}
      />,
    );
    fireEvent(getByTestId('keep-under-switch-calories'), 'valueChange', true);
    fireEvent.changeText(getByTestId('keep-under-input-calories'), '450');
    fireEvent.press(getByTestId('keep-under-apply'));
    expect(onApply.mock.calls[0][0]).toEqual({ calories: { max: 450 } });
  });

  it('strips non-numeric characters from input', () => {
    const { getByTestId } = render(
      <KeepUnderSheet visible onClose={jest.fn()} onApply={jest.fn()} />,
    );
    fireEvent(getByTestId('keep-under-switch-calories'), 'valueChange', true);
    fireEvent.changeText(getByTestId('keep-under-input-calories'), '5o0abc');
    expect((getByTestId('keep-under-input-calories') as any).props.value).toBe('50');
  });
});
