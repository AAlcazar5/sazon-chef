// frontend/components/recipe/RecipeVariantChip.tsx
// ROADMAP 4.0 Tier J18.1 — Recipe variant chip.
//
// A pastel pill rendered NEXT TO the recipe title (not as a footer
// disclaimer). Each chip surfaces one sibling variant ("same dish,
// different technique"). Tap navigates to the sibling recipe.
//
// Tag taxonomy locked: weeknight | sunday | campfire | lighter.
// Display labels are persona-grade — never "healthier alternative" /
// "guilt-free" / "skinny" / "macro-friendly".

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export type RecipeVariantTag = 'weeknight' | 'sunday' | 'campfire' | 'lighter';

interface RecipeVariantChipProps {
  tag: RecipeVariantTag;
  siblingRecipeId: string;
  onPress: (siblingRecipeId: string) => void;
}

const TAG_LABELS: Record<RecipeVariantTag, string> = {
  weeknight: 'Weeknight',
  sunday: 'Sunday',
  campfire: 'Campfire',
  lighter: 'Lighter',
};

const TAG_PASTEL: Record<RecipeVariantTag, { bg: string; bgDark: string; fg: string }> = {
  weeknight: { bg: Pastel.peach, bgDark: PastelDark.peach, fg: Accent.peach },
  sunday: { bg: Pastel.golden, bgDark: PastelDark.golden, fg: Accent.golden },
  campfire: { bg: Pastel.blush, bgDark: PastelDark.blush, fg: Accent.blush },
  lighter: { bg: Pastel.sage, bgDark: PastelDark.sage, fg: Accent.sage },
};

export default function RecipeVariantChip({
  tag,
  siblingRecipeId,
  onPress,
}: RecipeVariantChipProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!siblingRecipeId) return null;

  const palette = TAG_PASTEL[tag];
  const label = TAG_LABELS[tag];

  return (
    <HapticTouchableOpacity
      testID="recipe-variant-chip"
      onPress={() => onPress(siblingRecipeId)}
      accessibilityLabel={`${label} version`}
      accessibilityRole="button"
      pressedScale={0.97}
      hapticStyle="light"
      style={[styles.chip, { backgroundColor: isDark ? palette.bgDark : palette.bg }]}
    >
      <Text style={[styles.chipText, { color: palette.fg }]}>{label}</Text>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
