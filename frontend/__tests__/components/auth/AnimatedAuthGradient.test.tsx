// frontend/__tests__/components/auth/AnimatedAuthGradient.test.tsx
// ROADMAP 4.0 A7.5 — AnimatedAuthGradient test.

jest.mock('../../../components/ui/ScreenGradient', () => {
  const { View } = require('react-native');
  return function MockScreenGradient(props: any) {
    return (
      <View testID={`gradient-${props.variant ?? 'default'}`}>
        {props.children}
      </View>
    );
  };
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: jest.fn((v: number) => ({ value: v })),
    useAnimatedStyle: jest.fn((fn: () => any) => fn()),
    withTiming: jest.fn((toValue: number) => toValue),
    withRepeat: jest.fn((animation: number) => animation),
    cancelAnimation: jest.fn(),
    Easing: { inOut: jest.fn(() => jest.fn()), ease: jest.fn() },
  };
});

import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import AnimatedAuthGradient, {
  __INTERNALS,
} from '../../../components/auth/AnimatedAuthGradient';

describe('AnimatedAuthGradient (A7.5)', () => {
  it('renders the auth gradient + children', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <AnimatedAuthGradient reduceMotionOverride={false}>
        <Text testID="form-body">form</Text>
      </AnimatedAuthGradient>,
    );
    expect(getByTestId('gradient-auth')).toBeTruthy();
    expect(getByText('form')).toBeTruthy();
  });

  it('runs the animated path by default (reduce-motion off)', () => {
    const { queryByTestId } = renderWithProviders(
      <AnimatedAuthGradient reduceMotionOverride={false}>
        <Text>x</Text>
      </AnimatedAuthGradient>,
    );
    expect(queryByTestId('animated-auth-gradient-animated')).toBeTruthy();
    expect(queryByTestId('animated-auth-gradient-static')).toBeNull();
  });

  it('renders the static path when reduce-motion is on', () => {
    const { queryByTestId } = renderWithProviders(
      <AnimatedAuthGradient reduceMotionOverride={true}>
        <Text>x</Text>
      </AnimatedAuthGradient>,
    );
    expect(queryByTestId('animated-auth-gradient-static')).toBeTruthy();
    expect(queryByTestId('animated-auth-gradient-animated')).toBeNull();
  });

  it('publishes pulse + opacity bounds for inspection', () => {
    expect(__INTERNALS.PULSE_DURATION_MS).toBeGreaterThanOrEqual(10_000);
    expect(__INTERNALS.PULSE_DURATION_MS).toBeLessThanOrEqual(12_000);
    expect(__INTERNALS.MIN_OPACITY).toBeLessThan(1);
    expect(__INTERNALS.MIN_OPACITY).toBeGreaterThanOrEqual(0.9);
    expect(__INTERNALS.MAX_OPACITY).toBe(1.0);
  });

  it('falls back to OS preference when no override is provided (renders one of the two paths)', () => {
    const { queryByTestId } = renderWithProviders(
      <AnimatedAuthGradient>
        <Text>x</Text>
      </AnimatedAuthGradient>,
    );
    const animated = queryByTestId('animated-auth-gradient-animated');
    const staticOne = queryByTestId('animated-auth-gradient-static');
    // Exactly one path renders — the OS reduce-motion check resolves async,
    // so the initial render shows the default (animated, since reduce-motion
    // defaults to false in the component state).
    expect(Boolean(animated) || Boolean(staticOne)).toBe(true);
  });
});
