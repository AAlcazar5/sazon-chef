// frontend/components/meal-plan/WeeklyNutritionGlance.tsx
// ROADMAP 4.0 Tier A2-e — compact weekly nutrition strip on Meal Plan / Week tab.
//
// Lifestyle-voiced summary of the week so far. Tap → opens Stories view in
// Kitchen tab (Spotify-Wrapped-style recap). Hidden when no meals are
// cooked/planned this week.

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

interface WeeklyNutritionGlanceProps {
  /** Distinct cuisines on the week's plan/cooks. 0 hides the strip. */
  cuisineCount: number;
  /** Distinct whole-food ingredients across the week. */
  ingredientCount: number;
  /** Distinct food colors (visual variety proxy). */
  colorCount: number;
  /** Optional: nutrient the user is "crushing" this week (top by DV%). */
  crushingNutrient?: string;
  /** Tap handler — opens Kitchen → Stories view. */
  onPress: () => void;
}

export default function WeeklyNutritionGlance({
  cuisineCount,
  ingredientCount,
  colorCount,
  crushingNutrient,
  onPress,
}: WeeklyNutritionGlanceProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (cuisineCount <= 0) {
    return null;
  }

  const cuisineNoun = cuisineCount === 1 ? 'cuisine ' : 'cuisines';
  const summary = `${cuisineCount} ${cuisineNoun} · ${ingredientCount} ingredients · ${colorCount} colors`;
  const a11yLabel = crushingNutrient
    ? `This week so far — ${cuisineCount} cuisines, ${ingredientCount} ingredients, ${colorCount} colors. Crushing ${crushingNutrient}.`
    : `This week so far — ${cuisineCount} cuisines, ${ingredientCount} ingredients, ${colorCount} colors.`;

  return (
    <HapticTouchableOpacity
      testID="weekly-nutrition-glance"
      onPress={onPress}
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
      pressedScale={0.99}
      style={[
        styles.strip,
        { backgroundColor: isDark ? PastelDark.lavender : Pastel.lavender },
      ]}
    >
      <View style={styles.iconBlock}>
        <Ionicons name="leaf-outline" size={18} color={Accent.lavender} />
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.eyebrow, { color: Accent.lavender }]}>
          THIS WEEK SO FAR
        </Text>
        <Text style={[styles.summary, { color: Accent.lavender }]} numberOfLines={1}>
          {summary}
        </Text>
        {crushingNutrient && (
          <Text style={[styles.crushing, { color: Accent.lavender }]} numberOfLines={1}>
            Crushing {crushingNutrient}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Accent.lavender} />
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  crushing: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    marginTop: 2,
    opacity: 0.85,
  },
});
