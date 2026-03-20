// frontend/components/meal-plan/NutritionProgressRing.tsx
// Circular progress ring for a single nutrition goal (calories, protein, carbs, fat)

import React from 'react';
import { View, Text } from 'react-native';
import { Colors, DarkColors } from '../../constants/Colors';

interface NutritionProgressRingProps {
  /** Current progress 0–100 (clamped internally) */
  progress: number;
  /** Goal label shown below the ring */
  label: string;
  /** Diameter of the ring in pixels */
  size?: number;
  /** Ring fill colour */
  color?: string;
  /** Background track colour */
  trackColor?: string;
  /** Dark mode flag */
  isDark?: boolean;
}

/**
 * A simple circular progress ring using concentric Views.
 * `progress` is clamped to [0, 100] so callers never need to guard it.
 */
export default function NutritionProgressRing({
  progress,
  label,
  size = 80,
  color = '#FA7E12',
  trackColor,
  isDark = false,
}: NutritionProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const ringWidth = Math.round(size * 0.1);
  const resolvedTrack = trackColor ?? (isDark ? '#374151' : '#E5E7EB');

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        testID="nutrition-progress-ring"
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Background track */}
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringWidth,
            borderColor: resolvedTrack,
          }}
        />
        {/* Filled arc — simplified as a full ring at reduced opacity for 0 progress */}
        <View
          testID="progress-fill"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringWidth,
            borderColor: color,
            opacity: clamped > 0 ? clamped / 100 + 0.15 : 0,
          }}
        />
        {/* Centre percentage */}
        <Text
          testID="progress-percent"
          style={{
            fontSize: Math.round(size * 0.2),
            fontWeight: '700',
            color: isDark ? DarkColors.text.primary : Colors.text.primary,
          }}
        >
          {`${Math.round(clamped)}%`}
        </Text>
      </View>

      {/* Goal label */}
      <Text
        testID="progress-label"
        style={{
          marginTop: 4,
          fontSize: Math.round(size * 0.14),
          color: isDark ? '#9CA3AF' : '#6B7280',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
