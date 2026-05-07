// frontend/components/auth/AnimatedAuthGradient.tsx
// ROADMAP 4.0 A7.5 — Animated auth-screen gradient backdrop.
//
// Subtle slow-pulse on the auth gradient (10–12s loop, opacity 0.95 ↔ 1.0).
// Adds living-room-warm feeling without distracting from the form. Disables
// the animation when the user has reduce-motion enabled at the OS level.
//
// Wraps the existing ScreenGradient — drop-in replacement for the static
// gradient when used inside <AuthScreenShell>.

import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import ScreenGradient from '../ui/ScreenGradient';

const PULSE_DURATION_MS = 11_000;
const MIN_OPACITY = 0.95;
const MAX_OPACITY = 1.0;

export interface AnimatedAuthGradientProps {
  children?: React.ReactNode;
  /** Inject reduce-motion state for tests. */
  reduceMotionOverride?: boolean;
}

export default function AnimatedAuthGradient({
  children,
  reduceMotionOverride,
}: AnimatedAuthGradientProps) {
  const [reduceMotion, setReduceMotion] = useState<boolean>(
    reduceMotionOverride ?? false,
  );
  const opacity = useSharedValue(MAX_OPACITY);

  // Resolve OS reduce-motion preference (skipped when override provided).
  useEffect(() => {
    if (reduceMotionOverride !== undefined) {
      setReduceMotion(reduceMotionOverride);
      return;
    }
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((enabled: boolean) => {
        if (!cancelled) setReduceMotion(enabled);
      })
      .catch(() => {
        // Defensive — assume motion is OK
      });
    return () => {
      cancelled = true;
    };
  }, [reduceMotionOverride]);

  // Drive the loop only when motion is allowed.
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.value = MAX_OPACITY;
      return;
    }
    opacity.value = withRepeat(
      withTiming(MIN_OPACITY, {
        duration: PULSE_DURATION_MS / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      true, // reverse on each iteration
    );
    return () => {
      cancelAnimation(opacity);
    };
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    flex: 1,
  }));

  // When motion is reduced, render the plain gradient (no Animated wrapper)
  // so screen-reader / a11y tooling sees a static surface.
  if (reduceMotion) {
    return (
      <View
        testID="animated-auth-gradient-static"
        style={{ flex: 1 }}
      >
        <ScreenGradient variant="auth">{children}</ScreenGradient>
      </View>
    );
  }

  return (
    <Animated.View
      testID="animated-auth-gradient-animated"
      style={animatedStyle}
    >
      <ScreenGradient variant="auth">{children}</ScreenGradient>
    </Animated.View>
  );
}

export const __INTERNALS = {
  PULSE_DURATION_MS,
  MIN_OPACITY,
  MAX_OPACITY,
};
