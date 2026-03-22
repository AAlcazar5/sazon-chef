// frontend/__tests__/components/SwipeAffordanceHint.test.tsx
// Tests for the SwipeAffordanceHint one-time gesture tutorial component

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text, AccessibilityInfo, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SwipeAffordanceHint from '../../components/ui/SwipeAffordanceHint';

// Mock AccessibilityInfo
const mockIsReduceMotionEnabled = jest.fn(() => Promise.resolve(false));
jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(mockIsReduceMotionEnabled);

// Spy on Animated.sequence to track animation calls
const animatedSequenceSpy = jest.spyOn(Animated, 'sequence');
const animatedTimingSpy = jest.spyOn(Animated, 'timing');

describe('SwipeAffordanceHint', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockIsReduceMotionEnabled.mockResolvedValue(false);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders children', async () => {
    const { getByText } = render(
      <SwipeAffordanceHint storageKey="test-swipe" variant="swipe" testID="hint">
        <Text>Child content</Text>
      </SwipeAffordanceHint>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText('Child content')).toBeTruthy();
  });

  it('renders with testID', async () => {
    const { getByTestId } = render(
      <SwipeAffordanceHint storageKey="test-swipe" variant="swipe" testID="hint">
        <Text>Content</Text>
      </SwipeAffordanceHint>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId('hint')).toBeTruthy();
  });

  it('checks AsyncStorage for previous hint display', async () => {
    render(
      <SwipeAffordanceHint storageKey="shopping-swipe" variant="swipe">
        <Text>Content</Text>
      </SwipeAffordanceHint>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('hasSeenHint_shopping-swipe');
  });

  it('shows swipe hint animation on first visit (AsyncStorage empty)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    render(
      <SwipeAffordanceHint storageKey="first-swipe" variant="swipe" delay={100}>
        <Text>Swipeable item</Text>
      </SwipeAffordanceHint>
    );

    // Flush async checks
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Advance past delay to trigger animation
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // Animation should have been triggered
    expect(animatedSequenceSpy).toHaveBeenCalled();
  });

  it('does NOT show hint on subsequent visits (AsyncStorage has key)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    render(
      <SwipeAffordanceHint storageKey="seen-swipe" variant="swipe" delay={100}>
        <Text>Content</Text>
      </SwipeAffordanceHint>
    );

    // Flush async checks
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Advance past delay
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // setItem should NOT be called again since hint was already seen
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('shows longpress tooltip variant with default message', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByText } = render(
      <SwipeAffordanceHint storageKey="longpress-hint" variant="longpress" delay={100}>
        <Text>Item</Text>
      </SwipeAffordanceHint>
    );

    // Flush async checks
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Advance past delay to trigger tooltip
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // Tooltip with default message should appear
    expect(getByText('Hold to select multiple')).toBeTruthy();
  });

  it('shows longpress tooltip with custom message', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByText } = render(
      <SwipeAffordanceHint
        storageKey="custom-longpress"
        variant="longpress"
        message="Long press to reorder"
        delay={100}
      >
        <Text>Item</Text>
      </SwipeAffordanceHint>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(getByText('Long press to reorder')).toBeTruthy();
  });

  it('respects reduceMotion by not showing any hint', async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(true);

    render(
      <SwipeAffordanceHint storageKey="motion-test" variant="swipe" delay={100}>
        <Text>Content</Text>
      </SwipeAffordanceHint>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // Should not have checked or set AsyncStorage for the hint key
    // (early return before AsyncStorage check is after reduceMotion check)
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('persists hint shown state to AsyncStorage after animation', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    // Make Animated.sequence call the callback immediately
    animatedSequenceSpy.mockImplementation((animations) => ({
      start: (callback?: (result: { finished: boolean }) => void) => {
        callback?.({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));

    render(
      <SwipeAffordanceHint storageKey="persist-test" variant="swipe" delay={100}>
        <Text>Content</Text>
      </SwipeAffordanceHint>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('hasSeenHint_persist-test', 'true');

    // Restore original implementation
    animatedSequenceSpy.mockRestore();
  });

  it('uses different storage keys for different hints', async () => {
    render(
      <SwipeAffordanceHint storageKey="hint-A" variant="swipe">
        <Text>A</Text>
      </SwipeAffordanceHint>
    );

    render(
      <SwipeAffordanceHint storageKey="hint-B" variant="longpress">
        <Text>B</Text>
      </SwipeAffordanceHint>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('hasSeenHint_hint-A');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('hasSeenHint_hint-B');
  });
});
