// frontend/components/recipe/HealthierSwapRow.tsx
// ROADMAP 4.0 Tier C2 frontend — inline healthierSwap row.
//
// Pure presentation. Caller decides whether `surface` is true based on the
// user's gap state (via healthierSwapService.shouldSurfaceSwap or its
// frontend mirror). Renders nothing when surface=false or swap=null —
// lifestyle voice: no nudge unless it solves a real problem for THIS user.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export interface HealthierSwap {
  type: 'fiber' | 'protein' | 'calorie';
  text: string;
  deltaMacro: {
    fiber?: number;
    protein?: number;
    calories?: number;
  };
}

interface HealthierSwapRowProps {
  swap: HealthierSwap | null;
  surface: boolean;
  onApply: (swap: HealthierSwap) => void;
}

const TYPE_THEME: Record<
  HealthierSwap['type'],
  { tint: keyof typeof Pastel; accent: keyof typeof Accent; chipUnit: string }
> = {
  fiber: { tint: 'sage', accent: 'sage', chipUnit: 'g fiber' },
  protein: { tint: 'sage', accent: 'sage', chipUnit: 'g protein' },
  calorie: { tint: 'peach', accent: 'peach', chipUnit: ' cal' },
};

function formatDelta(swap: HealthierSwap): string {
  const theme = TYPE_THEME[swap.type];
  const value =
    swap.type === 'fiber'
      ? swap.deltaMacro.fiber
      : swap.type === 'protein'
      ? swap.deltaMacro.protein
      : swap.deltaMacro.calories;
  if (typeof value !== 'number') return '';
  const sign = value > 0 ? '+' : '−';
  return `${sign}${Math.abs(value)}${theme.chipUnit}`;
}

export default function HealthierSwapRow({ swap, surface, onApply }: HealthierSwapRowProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!surface || !swap) {
    return null;
  }

  const themeBlock = TYPE_THEME[swap.type];
  const cardBg = isDark ? PastelDark[themeBlock.tint] : Pastel[themeBlock.tint];
  const accent = Accent[themeBlock.accent];
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const delta = formatDelta(swap);

  return (
    <View
      testID="healthier-swap-row"
      style={[styles.row, { backgroundColor: cardBg }]}
    >
      <View style={styles.headerRow}>
        <Ionicons name="leaf-outline" size={14} color={accent} />
        <Text style={[styles.eyebrow, { color: accent }]}>IF YOU WANT TO UPGRADE</Text>
      </View>
      <Text style={[styles.body, { color: textPrimary }]}>{swap.text}</Text>
      <View style={styles.footerRow}>
        {delta.length > 0 && (
          <View style={[styles.deltaChip, { backgroundColor: accent }]}>
            <Text style={styles.deltaLabel}>{delta}</Text>
          </View>
        )}
        <View style={styles.spacer} />
        <HapticTouchableOpacity
          testID="healthier-swap-apply"
          onPress={() => onApply(swap)}
          accessibilityLabel="Try this swap"
          accessibilityRole="button"
          pressedScale={0.96}
          style={[styles.applyChip, { borderColor: accent }]}
        >
          <Text style={[styles.applyLabel, { color: accent }]}>Try this</Text>
        </HapticTouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    marginVertical: 6,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  body: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  deltaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  deltaLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  spacer: {
    flex: 1,
  },
  applyChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  applyLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 12,
  },
});
