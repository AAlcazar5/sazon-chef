// frontend/components/ui/WidgetCard.tsx
// Reusable pastel-tinted stat card for macro display, profile stats, cooking stats, shopping progress.
// Foundational building block for the colorful analytics system (9L).
//
// ROADMAP 4.0 DS7.4 — sourced from constants/tokens. Ink + accent + radius
// all flow from the canonical tokens.

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import { Shadows } from '../../constants/Shadows';
import { Ink, AccentTokens, Radius, Type } from '../../constants/tokens';

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

function WidgetCard({
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
  const textPrimary = isDark ? Ink.dark.warm : Ink.light.primary;
  const textSecondary = isDark ? Ink.dark.secondary : Ink.light.secondary;
  // a11y: AccentTokens.sage/blush fail AA body on light bg (~1.9:1). Use
  // darker variants for the trend arrow + value text; flip to the bright
  // accent tokens in dark mode where they sit on a darker pastel.
  const trendUpColor = isDark ? AccentTokens.sage : '#15803D';
  const trendDownColor = isDark ? AccentTokens.blush : '#9F1239';

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
                { color: trend.direction === 'up' ? trendUpColor : trendDownColor },
              ]}
            >
              {trend.direction === 'up' ? '↑' : '↓'}
            </Text>
            <Text
              style={[
                styles.trendValue,
                { color: trend.direction === 'up' ? trendUpColor : trendDownColor },
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
    borderRadius: Radius.card,
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
    // DS7.4 — Type.stat carries tabular-nums (DS5.4) so column-aligned numbers
    // don't shimmy. Stat-card displays are the canonical consumer.
    fontSize: 30,
    fontFamily: Type.stat.fontFamily, // PlusJakartaSans_700Bold
    fontVariant: Type.stat.fontVariant, // ['tabular-nums']
    letterSpacing: Type.stat.letterSpacing,
  },
  statUnit: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_500Medium',
    opacity: 0.5,
  },
  label: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
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
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  trendValue: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});

// P6: memoize. WidgetCard is rendered as a 2x2 grid of stat tiles on the
// profile + cooking-stats screens; sibling stat changes shouldn't cascade
// into all four cards re-rendering.
export default React.memo(WidgetCard);
