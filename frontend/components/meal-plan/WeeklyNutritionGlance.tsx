// frontend/components/meal-plan/WeeklyNutritionGlance.tsx
// ROADMAP 4.0 Tier A2-e — compact weekly nutrition strip on Meal Plan / Week tab.
//
// Lifestyle-voiced summary of the week so far. Tap → opens Stories view in
// Kitchen tab (Spotify-Wrapped-style recap). Hidden when no meals are
// cooked/planned this week.

import React from 'react';
import DiscoveryStrip from '../ui/DiscoveryStrip';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';

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
    <DiscoveryStrip
      testID="weekly-nutrition-glance"
      eyebrow="THIS WEEK SO FAR"
      summary={summary}
      detail={crushingNutrient ? `Crushing ${crushingNutrient}` : undefined}
      accentColor={Accent.lavender}
      backgroundColor={isDark ? PastelDark.lavender : Pastel.lavender}
      onPress={onPress}
      accessibilityLabel={a11yLabel}
    />
  );
}
