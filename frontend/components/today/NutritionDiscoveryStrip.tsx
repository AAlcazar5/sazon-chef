// frontend/components/today/NutritionDiscoveryStrip.tsx
// ROADMAP 4.0 Tier A1-b — Today nutrition discovery strip.
//
// Beautiful glanceable summary of yesterday's plate. Tap to expand into
// today + yesterday view. Discovery framing — never punitive.

import React from 'react';
import DiscoveryStrip from '../ui/DiscoveryStrip';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';

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
    <DiscoveryStrip
      testID="nutrition-discovery-strip"
      eyebrow="YESTERDAY"
      summary={summary}
      detail={topMineral ? `Top mineral: ${topMineral}` : undefined}
      accentColor={Accent.sage}
      backgroundColor={isDark ? PastelDark.sage : Pastel.sage}
      onPress={onPress}
      accessibilityLabel={a11yLabel}
      padding={{ horizontal: 18, vertical: 16 }}
    />
  );
}
