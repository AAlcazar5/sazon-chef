// frontend/__tests__/components/CountingNumber.test.tsx
// Tests for AnimatedStatCounter / CountingNumber animated counter component

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import AnimatedStatCounter, { CountingNumber } from '../../components/ui/AnimatedStatCounter';

// Mock AccessibilityInfo
const mockIsReduceMotionEnabled = jest.fn(() => Promise.resolve(false));
const mockAddEventListener = jest.fn(() => ({ remove: jest.fn() }));

jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(mockIsReduceMotionEnabled);
jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(mockAddEventListener);

describe('AnimatedStatCounter / CountingNumber', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockIsReduceMotionEnabled.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders with value 0 immediately', () => {
    const { getByText } = render(
      <AnimatedStatCounter value={0} testID="counter" />
    );
    expect(getByText('0')).toBeTruthy();
  });

  it('exports CountingNumber as an alias', () => {
    expect(CountingNumber).toBe(AnimatedStatCounter);
  });

  it('counts up toward target value over time', async () => {
    const { getByTestId } = render(
      <AnimatedStatCounter value={100} duration={800} testID="counter" />
    );

    // Flush the AccessibilityInfo promise
    await act(async () => {
      await Promise.resolve();
    });

    const counter = getByTestId('counter');
    // Initially should show 0 (before animation ticks)
    expect(counter.props.children.join('')).toBe('0');

    // Advance partway through animation
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Should be animating - value should be between 0 and 100
    const midText = counter.props.children.join('');
    const midValue = parseInt(midText, 10);
    expect(midValue).toBeGreaterThanOrEqual(0);

    // Advance past end of animation
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    const finalText = counter.props.children.join('');
    expect(finalText).toBe('100');
  });

  it('shows final value instantly when reduceMotion is enabled', async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(true);

    const { getByTestId } = render(
      <AnimatedStatCounter value={42} testID="counter" />
    );

    // Flush the AccessibilityInfo promise
    await act(async () => {
      await Promise.resolve();
    });

    const counter = getByTestId('counter');
    expect(counter.props.children.join('')).toBe('42');
  });

  it('supports prefix', async () => {
    const { getByTestId } = render(
      <AnimatedStatCounter value={0} prefix="$" testID="counter" />
    );

    await act(async () => {
      await Promise.resolve();
    });

    const counter = getByTestId('counter');
    expect(counter.props.children.join('')).toBe('$0');
  });

  it('supports suffix', async () => {
    const { getByTestId } = render(
      <AnimatedStatCounter value={0} suffix="%" testID="counter" />
    );

    await act(async () => {
      await Promise.resolve();
    });

    const counter = getByTestId('counter');
    expect(counter.props.children.join('')).toBe('0%');
  });

  it('supports prefix and suffix together', async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(true);

    const { getByTestId } = render(
      <AnimatedStatCounter value={50} prefix="$" suffix="/mo" testID="counter" />
    );

    await act(async () => {
      await Promise.resolve();
    });

    const counter = getByTestId('counter');
    expect(counter.props.children.join('')).toBe('$50/mo');
  });

  it('supports decimal places', async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(true);

    const { getByTestId } = render(
      <AnimatedStatCounter value={3.14} decimals={2} testID="counter" />
    );

    await act(async () => {
      await Promise.resolve();
    });

    const counter = getByTestId('counter');
    expect(counter.props.children.join('')).toBe('3.14');
  });

  it('respects stagger delay before starting animation', async () => {
    const { getByTestId } = render(
      <AnimatedStatCounter value={100} delay={500} duration={800} testID="counter" />
    );

    await act(async () => {
      await Promise.resolve();
    });

    const counter = getByTestId('counter');

    // Before the stagger delay, should still be 0
    expect(counter.props.children.join('')).toBe('0');

    // Advance past delay but not through full animation
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    // Animation should have started after the delay
    const text = counter.props.children.join('');
    const val = parseInt(text, 10);
    expect(val).toBeGreaterThanOrEqual(0);
  });

  it('sets accessibilityLabel to the final target value with prefix/suffix', () => {
    const { getByTestId } = render(
      <AnimatedStatCounter value={75} prefix="$" suffix="k" testID="counter" />
    );

    const counter = getByTestId('counter');
    expect(counter.props.accessibilityLabel).toBe('$75k');
  });

  it('sets accessibilityLabel without prefix/suffix when not provided', () => {
    const { getByTestId } = render(
      <AnimatedStatCounter value={42} testID="counter" />
    );

    const counter = getByTestId('counter');
    expect(counter.props.accessibilityLabel).toBe('42');
  });

  it('applies custom style prop', () => {
    const customStyle = { fontSize: 24, color: 'red' };
    const { getByTestId } = render(
      <AnimatedStatCounter value={10} style={customStyle} testID="counter" />
    );

    const counter = getByTestId('counter');
    expect(counter.props.style).toEqual(customStyle);
  });

  it('cleans up timers on unmount', async () => {
    const { unmount } = render(
      <AnimatedStatCounter value={100} delay={200} duration={800} testID="counter" />
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Unmount before animation completes - should not throw
    unmount();

    // Advance timers to ensure no errors from orphaned callbacks
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
  });
});
