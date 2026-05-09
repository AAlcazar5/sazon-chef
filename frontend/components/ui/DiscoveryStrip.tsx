// frontend/components/ui/DiscoveryStrip.tsx
// K19: shared layout for the pastel "discovery" tap-strips on Today + Week.
// Both NutritionDiscoveryStrip (Today, sage) and WeeklyNutritionGlance
// (Week, lavender) used to inline the same icon + eyebrow + summary +
// optional detail + chevron pattern.
//
// The wrapping screen-specific components compute the strings + colors
// and pass them in; this component owns layout and accessibility.

import React from 'react';
import { Text, View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import { EditorialFontFamily } from '../../constants/Typography';

export interface DiscoveryStripProps {
  /** Small all-caps eyebrow above the summary (e.g., "YESTERDAY"). */
  eyebrow: string;
  /** Main one-line summary string. */
  summary: string;
  /** Optional secondary line under the summary (e.g., "Top mineral: magnesium"). */
  detail?: string;
  /** Accent color used for icon + all text + chevron. */
  accentColor: string;
  /** Pastel background tint. */
  backgroundColor: string;
  /** Tap handler. */
  onPress: () => void;
  /** Required a11y label — the wrapping component knows the full sentence to announce. */
  accessibilityLabel: string;
  /** Optional testID. */
  testID?: string;
  /** Optional padding override (default 16/14 to match Tier A1-b normalized card). */
  padding?: { horizontal: number; vertical: number };
}

export default function DiscoveryStrip({
  eyebrow,
  summary,
  detail,
  accentColor,
  backgroundColor,
  onPress,
  accessibilityLabel,
  testID,
  padding,
}: DiscoveryStripProps) {
  const stripStyle: ViewStyle = {
    ...styles.strip,
    backgroundColor,
    paddingHorizontal: padding?.horizontal ?? 16,
    paddingVertical: padding?.vertical ?? 14,
  };

  return (
    <HapticTouchableOpacity
      testID={testID}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      pressedScale={0.99}
      style={stripStyle}
    >
      <View style={styles.iconBlock}>
        <Ionicons name="leaf-outline" size={18} color={accentColor} />
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.eyebrow, { color: accentColor }]}>{eyebrow}</Text>
        <Text style={[styles.summary, { color: accentColor }]} numberOfLines={1}>
          {summary}
        </Text>
        {detail && (
          <Text style={[styles.detail, { color: accentColor }]} numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={accentColor} />
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  iconBlock: {
    width: 36,
    height: 36,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  summary: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
  },
  detail: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    marginTop: 2,
    opacity: 0.85,
  },
});
