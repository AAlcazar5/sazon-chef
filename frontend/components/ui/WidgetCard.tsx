// frontend/components/ui/WidgetCard.tsx
// Reusable pastel-tinted stat card for macro display, profile stats, cooking stats, shopping progress.
// Foundational building block for the colorful analytics system (9L).

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import { Colors, DarkColors, Accent } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';

interface TrendData {
  value: string;
  direction: 'up' | 'down';
}

interface WidgetCardProps {
  /** Pastel background color (light mode) */
  tint: string;
  /** Dark mode tint override (defaults to semi-transparent version) */
  tintDark?: string;
  /** Emoji or icon string displayed top-left */
  icon: string;
  /** Primary stat value */
  statValue: string | number;
  /** Optional unit next to value (e.g., "g", "kcal", "days") */
  statUnit?: string;
  /** Descriptive label below value */
  label: string;
  /** Optional trend indicator */
  trend?: TrendData;
  /** Optional press handler for tappable widgets */
  onPress?: () => void;
  /** Additional container styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

export default function WidgetCard({
  tint,
  tintDark,
  icon,
  statValue,
  statUnit,
  label,
  trend,
  onPress,
  style,
  testID,
}: WidgetCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? (tintDark || tint + '1F') : tint;
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const content = (
    <View
      style={[
        styles.container,
        { backgroundColor: bgColor },
        Shadows.SM as ViewStyle,
        style,
      ]}
      testID={testID}
      accessibilityLabel={`${label}: ${statValue}${statUnit || ''}`}
    >
      <Text style={styles.icon}>{icon}</Text>

      <View style={styles.valueRow}>
        <Text style={[styles.statValue, { color: textPrimary }]}>
          {statValue}
        </Text>
        {statUnit && (
          <Text style={[styles.statUnit, { color: textSecondary }]}>
            {statUnit}
          </Text>
        )}
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.label, { color: textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        {trend && (
          <View style={styles.trendContainer}>
            <Text
              style={[
                styles.trendArrow,
                { color: trend.direction === 'up' ? Accent.sage : Accent.blush },
              ]}
            >
              {trend.direction === 'up' ? '↑' : '↓'}
            </Text>
            <Text
              style={[
                styles.trendValue,
                { color: trend.direction === 'up' ? Accent.sage : Accent.blush },
              ]}
            >
              {trend.value}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <HapticTouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        hapticStyle="light"
        style={{ flex: 1 }}
      >
        {content}
      </HapticTouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.card,
    padding: 14,
    flex: 1,
    minHeight: 100,
  },
  icon: {
    fontSize: 20,
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  statValue: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.extrabold,
  },
  statUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    opacity: 0.5,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendArrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  trendValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
