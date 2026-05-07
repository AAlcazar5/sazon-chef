// frontend/components/recipe/RecipeVariantChipRow.tsx
// ROADMAP 4.0 RD3.1 — Variant chips above the recipe title.
//
// Same dish, different technique. Tag taxonomy is the J18.1 canonical set:
// weeknight | sunday | campfire | lighter — anything else is silently
// dropped. Banned vocab ("healthier" / "skinny" / "guilt-free" / etc.) is
// kept out of the surface; the chip label is the bare tag.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';

export type VariantTag = 'weeknight' | 'sunday' | 'campfire' | 'lighter';

const VALID_TAGS: ReadonlyArray<VariantTag> = ['weeknight', 'sunday', 'campfire', 'lighter'];

const TAG_TINT: Record<VariantTag, { bg: keyof typeof Pastel; accent: keyof typeof Accent; emoji: string }> = {
  weeknight: { bg: 'sky', accent: 'sky', emoji: '⚡' },
  sunday: { bg: 'lavender', accent: 'lavender', emoji: '🌿' },
  campfire: { bg: 'peach', accent: 'peach', emoji: '🔥' },
  lighter: { bg: 'sage', accent: 'sage', emoji: '🍃' },
};

export interface RecipeVariantEntry {
  tag: string;
  siblingRecipe: {
    id: string;
    title: string;
  };
  techniqueLine?: string | null;
}

export interface RecipeVariantChipRowProps {
  variants?: RecipeVariantEntry[];
}

function isValidVariantTag(tag: string): tag is VariantTag {
  return (VALID_TAGS as ReadonlyArray<string>).includes(tag);
}

export default function RecipeVariantChipRow({ variants }: RecipeVariantChipRowProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;

  const valid = (variants ?? []).filter((v) => isValidVariantTag(v.tag));
  if (valid.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      testID="recipe-variant-chip-row"
    >
      {valid.map((v) => {
        const tag = v.tag as VariantTag;
        const tint = TAG_TINT[tag];
        const bg = isDark ? PastelDark[tint.bg] : Pastel[tint.bg];
        return (
          <HapticTouchableOpacity
            key={`${v.siblingRecipe.id}-${tag}`}
            testID={`recipe-variant-chip-${tag}`}
            accessibilityRole="button"
            accessibilityLabel={`${tag} variant: ${v.siblingRecipe.title}`}
            onPress={() => {
              router.push(
                `/recipe/${encodeURIComponent(v.siblingRecipe.id)}?referrer=detail-variant` as never,
              );
            }}
            style={[styles.chip, { backgroundColor: bg }]}
          >
            <Text style={styles.emoji}>{tint.emoji}</Text>
            <Text style={[styles.label, { color: text }]} numberOfLines={1}>
              {tag}
            </Text>
          </HapticTouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 6,
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
});
