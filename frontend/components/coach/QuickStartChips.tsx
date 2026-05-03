// frontend/components/coach/QuickStartChips.tsx
// 10Y-B: 4 pastel quick-start chips. Tapping one fills the composer.
// Phase 3: chipsFromCoachContext derives N=1 chips from live user signals.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark, Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/Shadows';

const TINTS: Array<{ light: string; dark: string }> = [
  { light: Pastel.sage,     dark: PastelDark.sage },
  { light: Pastel.peach,    dark: PastelDark.peach },
  { light: Pastel.lavender, dark: PastelDark.lavender },
  { light: Pastel.sky,      dark: PastelDark.sky },
];

interface QuickStartChipsProps {
  chips: string[];
  onSelect: (text: string) => void;
}

export default function QuickStartChips({ chips, onSelect }: QuickStartChipsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((label, i) => {
        const tint = TINTS[i % TINTS.length];
        const bg = isDark ? tint.dark : tint.light;
        return (
          <HapticTouchableOpacity
            key={`${label}-${i}`}
            onPress={() => onSelect(label)}
            accessibilityLabel={`Use prompt: ${label}`}
            accessibilityRole="button"
            style={[styles.chip, Shadows.SM as any, { backgroundColor: bg }]}
          >
            <Text style={[styles.chipText, { color: text }]} numberOfLines={2}>
              {label}
            </Text>
          </HapticTouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 4,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 240,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});

interface CoachContextLike {
  pantryExpiringSoon: string[];
  remainingMacros: { calories: number; protein: number; carbs: number; fat: number } | null;
  leftoverInventory: Array<{ componentId: string }>;
  topAdjacentCuisine: string | null;
}

const FALLBACK_CHIPS: readonly string[] = [
  'Plan tonight\'s dinner',
  'Suggest a high-protein lunch',
  'What\'s a quick 20-minute meal?',
  'Surprise me with a new cuisine',
];

export function chipsFromCoachContext(ctx: CoachContextLike): string[] {
  const chips: string[] = [];

  if (ctx.pantryExpiringSoon.length > 0) {
    const item = ctx.pantryExpiringSoon[0];
    chips.push(`I have leftover ${item} — bridge it forward`);
  }

  if (ctx.remainingMacros && ctx.remainingMacros.calories > 0) {
    chips.push(`${Math.round(ctx.remainingMacros.calories)} cal left — what should I eat?`);
  }

  if (ctx.topAdjacentCuisine) {
    chips.push(`Try a ${ctx.topAdjacentCuisine} dish I haven't yet`);
  }

  for (const fallback of FALLBACK_CHIPS) {
    if (chips.length >= 4) break;
    if (!chips.includes(fallback)) chips.push(fallback);
  }

  return chips.slice(0, 4);
}
