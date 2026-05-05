// frontend/components/today/NutritionDiscoveryStrip.tsx
// ROADMAP 4.0 Tier A1-b — Today nutrition discovery strip.
//
// Beautiful glanceable summary of yesterday's plate. Tap to expand into
// today + yesterday view. Discovery framing — never punitive.

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

interface NutritionDiscoveryStripProps {
  /** Distinct cuisines on yesterday's cooked meals. 0 hides the strip. */
  cuisineCount: number;
  /** Distinct whole-food ingredients across yesterday's meals. */
  ingredientCount: number;
  /** Distinct food colors (visual variety proxy). */
  colorCount: number;
  /** Top mineral from yesterday's intake (e.g., "magnesium"). null hides the line. */
  topMineral: string | null;
  /** Tap handler — opens today + yesterday detail view. */
  onPress: () => void;
}

export default function NutritionDiscoveryStrip({
  cuisineCount,
  ingredientCount,
  colorCount,
  topMineral,
  onPress,
}: NutritionDiscoveryStripProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (cuisineCount <= 0) {
    return null;
  }

  const cuisineNoun = cuisineCount === 1 ? 'cuisine ' : 'cuisines';
  const summary = `${cuisineCount} ${cuisineNoun} · ${ingredientCount} ingredients · ${colorCount} colors`;
  const a11yLabel = topMineral
    ? `Yesterday — ${cuisineCount} cuisines, ${ingredientCount} ingredients, ${colorCount} colors. Top mineral: ${topMineral}.`
    : `Yesterday — ${cuisineCount} cuisines, ${ingredientCount} ingredients, ${colorCount} colors.`;

  return (
    <HapticTouchableOpacity
      testID="nutrition-discovery-strip"
      onPress={onPress}
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
      pressedScale={0.99}
      style={[
        styles.strip,
        { backgroundColor: isDark ? PastelDark.sage : Pastel.sage },
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="leaf-outline" size={18} color={Accent.sage} />
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.eyebrow, { color: Accent.sage }]}>YESTERDAY</Text>
        <Text style={[styles.summary, { color: Accent.sage }]} numberOfLines={1}>
          {summary}
        </Text>
        {topMineral && (
          <Text style={[styles.detail, { color: Accent.sage }]} numberOfLines={1}>
            Top mineral: {topMineral}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Accent.sage} />
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    // Card dimensions normalized to match Today/Kitchen standard:
    // padHoriz 18, padVert 16, borderRadius 20, marginHoriz 16.
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  iconWrap: {
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
