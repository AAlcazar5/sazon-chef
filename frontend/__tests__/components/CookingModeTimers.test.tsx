// frontend/__tests__/components/CookingModeTimers.test.tsx

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import CookingModeTimers, { CookingTimer } from '../../components/recipe/CookingModeTimers';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchableOpacity(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: { accessibilityLabel?: string }) {
    return <Text>{accessibilityLabel || 'icon'}</Text>;
  };
});

const makeTimer = (overrides: Partial<CookingTimer> = {}): CookingTimer => ({
  id: 'timer-1',
  label: 'Simmer sauce',
  totalSeconds: 300,
  remainingSeconds: 180,
  running: true,
  completed: false,
  ...overrides,
});

describe('CookingModeTimers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when timers array is empty', () => {
    const { toJSON } = render(
      <CookingModeTimers timers={[]} onTick={jest.fn()} onToggle={jest.fn()} onDismiss={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the timer label', () => {
    const { getByText } = render(
      <CookingModeTimers
        timers={[makeTimer()]}
        onTick={jest.fn()}
        onToggle={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(getByText('Simmer sauce')).toBeTruthy();
  });

  it('renders the countdown in mm:ss format', () => {
    const { getByText } = render(
      <CookingModeTimers
        timers={[makeTimer({ remainingSeconds: 180 })]}
        onTick={jest.fn()}
        onToggle={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(getByText('03:00')).toBeTruthy();
  });

  it('renders ✅ when timer is completed', () => {
    const { getByText } = render(
      <CookingModeTimers
        timers={[makeTimer({ completed: true, remainingSeconds: 0 })]}
        onTick={jest.fn()}
        onToggle={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(getByText('✅')).toBeTruthy();
  });

  it('does not render countdown when timer is completed', () => {
    const { queryByText } = render(
      <CookingModeTimers
        timers={[makeTimer({ completed: true, remainingSeconds: 0 })]}
        onTick={jest.fn()}
        onToggle={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(queryByText('0:00')).toBeNull();
  });

  it('calls onDismiss when close button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <CookingModeTimers
        timers={[makeTimer()]}
        onTick={jest.fn()}
        onToggle={jest.fn()}
        onDismiss={onDismiss}
      />
    );
    fireEvent.press(getByText('icon')); // Icon for close
    expect(onDismiss).toHaveBeenCalledWith('timer-1');
  });

  it('calls onToggle when play/pause is pressed on active timer', () => {
    const onToggle = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <CookingModeTimers
        timers={[makeTimer({ running: true })]}
        onTick={jest.fn()}
        onToggle={onToggle}
        onDismiss={jest.fn()}
      />
    );
    // Controls row: first TouchableOpacity in the card is the play/pause button
    // (dismiss button comes second in the controls row)
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);
    expect(onToggle).toHaveBeenCalledWith('timer-1');
  });

  it('calls onTick every second for a running timer', () => {
    const onTick = jest.fn();
    render(
      <CookingModeTimers
        timers={[makeTimer({ running: true })]}
        onTick={onTick}
        onToggle={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    act(() => { jest.advanceTimersByTime(3000); });
    expect(onTick).toHaveBeenCalledTimes(3);
    expect(onTick).toHaveBeenCalledWith('timer-1');
  });

  it('does NOT call onTick when timer is paused', () => {
    const onTick = jest.fn();
    render(
      <CookingModeTimers
        timers={[makeTimer({ running: false })]}
        onTick={onTick}
        onToggle={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    act(() => { jest.advanceTimersByTime(3000); });
    expect(onTick).not.toHaveBeenCalled();
  });

  it('does NOT call onTick for completed timers', () => {
    const onTick = jest.fn();
    render(
      <CookingModeTimers
        timers={[makeTimer({ completed: true, running: false })]}
        onTick={onTick}
        onToggle={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    act(() => { jest.advanceTimersByTime(3000); });
    expect(onTick).not.toHaveBeenCalled();
  });

  it('renders multiple timer cards', () => {
    const timers = [
      makeTimer({ id: 't1', label: 'Boil pasta' }),
      makeTimer({ id: 't2', label: 'Simmer sauce' }),
    ];
    const { getByText } = render(
      <CookingModeTimers timers={timers} onTick={jest.fn()} onToggle={jest.fn()} onDismiss={jest.fn()} />
    );
    expect(getByText('Boil pasta')).toBeTruthy();
    expect(getByText('Simmer sauce')).toBeTruthy();
  });

  it('fires haptic notification when a timer completes', async () => {
    const Haptics = require('expo-haptics');
    const { rerender } = render(
      <CookingModeTimers
        timers={[makeTimer({ running: true, completed: false })]}
        onTick={jest.fn()}
        onToggle={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    // Simulate timer completing
    rerender(
      <CookingModeTimers
        timers={[makeTimer({ running: false, completed: true, remainingSeconds: 0 })]}
        onTick={jest.fn()}
        onToggle={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });

  it('does not fire duplicate completion haptic on re-render', () => {
    const Haptics = require('expo-haptics');
    const completedTimer = makeTimer({ completed: true, remainingSeconds: 0 });
    const { rerender } = render(
      <CookingModeTimers
        timers={[completedTimer]}
        onTick={jest.fn()}
        onToggle={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    rerender(
      <CookingModeTimers
        timers={[completedTimer]}
        onTick={jest.fn()}
        onToggle={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    // Haptic fires once on first render (ref starts empty), then NOT again on re-render
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });
});
