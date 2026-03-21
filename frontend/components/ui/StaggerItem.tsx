// frontend/components/ui/StaggerItem.tsx
// Lightweight wrapper that applies staggered entrance animation to list items.
// Only animates on initial mount — no re-animation on scroll or re-render.
// Respects system reduced motion preference.

import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

interface StaggerItemProps {
  /** Position in the list (0-indexed) — controls stagger delay */
  index: number;
  /** Delay per item in ms (default 40) */
  staggerMs?: number;
  /** Max total delay cap in ms (default 600) */
  maxDelay?: number;
  /** Animation duration in ms (default 350) */
  duration?: number;
  /** Whether to slide up or just fade (default 'fade-up') */
  variant?: 'fade' | 'fade-up';
  style?: ViewStyle;
  children: React.ReactNode;
}

export default function StaggerItem({
  index,
  staggerMs = 40,
  maxDelay = 600,
  duration = 350,
  variant = 'fade-up',
  style,
  children,
}: StaggerItemProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <View style={style}>{children}</View>;
  }

  const delay = Math.min(index * staggerMs, maxDelay);

  const entering = variant === 'fade-up'
    ? FadeInDown.delay(delay).duration(duration).springify().damping(18).stiffness(200)
    : FadeIn.delay(delay).duration(duration);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
