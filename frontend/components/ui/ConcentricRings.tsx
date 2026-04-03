// frontend/components/ui/ConcentricRings.tsx
// Apple Fitness-style nested progress rings. Outer → inner with decreasing size.
// Used for daily dashboard: calories (outer), protein (middle), streak (inner).

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import ProgressRing from './ProgressRing';
import { Accent } from '../../constants/Colors';

interface RingConfig {
  /** Progress 0–1 */
  progress: number;
  /** Gradient colors or solid color */
  color: string | string[];
  /** Optional label inside ring (only innermost ring center shows) */
  label?: string;
}

interface ConcentricRingsProps {
  /** Overall diameter of the outermost ring */
  size: number;
  /** Stroke width per ring (default 8) */
  strokeWidth?: number;
  /** Gap between rings (default 4) */
  ringGap?: number;
  /** Ring configs from outer to inner */
  rings: RingConfig[];
  /** Center content rendered inside innermost ring */
  children?: React.ReactNode;
  /** Track background color */
  bgColor?: string;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

/** Default preset: calories / protein / streak */
export const DAILY_RINGS_PRESET = {
  calories: (progress: number): RingConfig => ({
    progress,
    color: [Accent.peach, '#FB923C'],
  }),
  protein: (progress: number): RingConfig => ({
    progress,
    color: [Accent.sage, '#66BB6A'],
  }),
  streak: (progress: number): RingConfig => ({
    progress,
    color: ['#FB923C', '#EF4444'],
  }),
};

export default function ConcentricRings({
  size,
  strokeWidth = 8,
  ringGap = 4,
  rings,
  children,
  bgColor,
  style,
  testID,
}: ConcentricRingsProps) {
  return (
    <View
      style={[styles.container, { width: size, height: size }, style]}
      testID={testID}
    >
      {rings.map((ring, index) => {
        const ringSize = size - index * (strokeWidth * 2 + ringGap * 2);
        if (ringSize <= strokeWidth * 2) return null;

        return (
          <View
            key={index}
            style={[
              styles.ringLayer,
              { width: size, height: size },
            ]}
          >
            <ProgressRing
              progress={ring.progress}
              size={ringSize}
              strokeWidth={strokeWidth}
              color={ring.color}
              bgColor={bgColor}
            />
          </View>
        );
      })}

      {/* Center content */}
      {children && (
        <View style={[styles.center, { width: size, height: size }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  ringLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
