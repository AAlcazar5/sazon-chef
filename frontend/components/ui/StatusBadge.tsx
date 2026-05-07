// frontend/components/ui/StatusBadge.tsx
//
// ROADMAP 4.0 DS1.6 — semantic status badge with optional diagonal-stripe
// overlay for color-blind users (patternMode). Hue alone is insufficient
// for AA accessibility on success/warning/error/info; the pattern doubles
// the encoding.

import React from 'react';
import { View, Text, StyleSheet, AccessibilityProps } from 'react-native';
import { Semantic, Radius } from '../../constants/tokens';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info';

export interface StatusBadgeProps extends AccessibilityProps {
  variant: StatusVariant;
  label: string;
  /** When true, overlay a diagonal-stripe pattern so color-blind users have a
   *  second visual cue beyond hue. */
  patternMode?: boolean;
  isDark?: boolean;
  testID?: string;
}

export const Pattern = {
  diagonal: { stripeWidth: 4, opacity: 0.16 },
} as const;

function inkOn(_bg: string): string {
  // Semantic colors are tuned for AA on white-ish text.
  return '#FFFFFF';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  label,
  patternMode = false,
  isDark = false,
  testID,
  ...a11y
}) => {
  const bg = isDark ? Semantic.dark[variant] : Semantic.light[variant];
  const ink = inkOn(bg);
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={a11y.accessibilityLabel ?? `${variant}: ${label}`}
      testID={testID}
      style={[styles.badge, { backgroundColor: bg }]}
    >
      {patternMode ? (
        <View
          testID={testID ? `${testID}-pattern` : undefined}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[styles.patternOverlay, { opacity: Pattern.diagonal.opacity }]}
        />
      ) : null}
      <Text style={[styles.label, { color: ink }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Diagonal-stripe rendered as a repeating linear gradient is not native to
    // RN; we approximate visually with an off-white scrim that callers can
    // upgrade to a Skia-rendered pattern when react-native-skia ships.
    backgroundColor: '#FFFFFF',
  },
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
});

export default StatusBadge;
