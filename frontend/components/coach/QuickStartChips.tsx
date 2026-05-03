// frontend/components/coach/QuickStartChips.tsx
// 10Y-B: 4 pastel quick-start chips. Tapping one fills the composer.

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
