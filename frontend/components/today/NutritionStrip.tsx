// frontend/components/today/NutritionStrip.tsx
// ROADMAP 4.0 D14 — daily nutrient roll-up for the Today screen.
// ROADMAP 4.0 DS7.1 — reference-implementation migration: every visual token
// sources from constants/tokens (no Colors.* / DarkColors.* / Pastel.* /
// PastelDark.* / Accent.* / EditorialFontFamily on this surface).
//
// Six pills horizontally scrolling. Tap any pill → opens the day's
// full nutrition recap. Hidden when nutritionUIDensity === 'minimal'.
// Voice: discovery only — "today's plate hit 14 mg iron" never
// "you're low on iron".

import React from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { PastelTokens, AccentTokens, Ink, Type, Radius, Space } from '../../constants/tokens';
import {
  NUTRIENT_META,
  DAILY_TOP_NUTRIENTS,
  dvPercent,
  formatNutrientValue,
  type NutrientKey,
  type NutritionUIDensity,
} from '../../constants/Nutrients';

export interface DailyNutritionSnapshot {
  date: string;
  mealCount: number;
  [nutrient: string]: number | string | null | undefined;
}

interface NutritionStripProps {
  snapshot: DailyNutritionSnapshot | null;
  density?: NutritionUIDensity;
  onPress?: () => void;
}

export default function NutritionStrip({
  snapshot,
  density = 'macros + micros',
  onPress,
}: NutritionStripProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!snapshot || density === 'minimal') return null;

  const pills = DAILY_TOP_NUTRIENTS.filter(key => typeof snapshot[key] === 'number');
  // No nutrients today → render nothing rather than a placeholder line.
  // The strip reappears when the user logs their first meal.
  if (pills.length === 0) return null;

  return (
    <ScrollView
      testID="nutrition-strip"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {pills.map(key => (
        <Pill
          key={key}
          nutrient={key}
          value={snapshot[key] as number}
          isDark={isDark}
          onPress={onPress}
        />
      ))}
    </ScrollView>
  );
}

interface PillProps {
  nutrient: NutrientKey;
  value: number;
  isDark: boolean;
  onPress?: () => void;
}

function Pill({ nutrient, value, isDark, onPress }: PillProps) {
  const meta = NUTRIENT_META[nutrient];
  const pct = dvPercent(value, nutrient);
  const tint = isDark ? PastelTokens.dark.sage : PastelTokens.light.sage;

  return (
    <HapticTouchableOpacity
      testID={`nutrition-pill-${nutrient}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}: ${formatNutrientValue(value, nutrient)}${pct ? `, ${pct}% daily value` : ''}`}
      style={[styles.pill, { backgroundColor: tint }]}
    >
      <Text style={[styles.pillLabel, { color: AccentTokens.sage }]}>{meta.label}</Text>
      <Text
        style={[
          styles.pillValue,
          { color: isDark ? Ink.dark.primary : Ink.light.primary },
        ]}
      >
        {formatNutrientValue(value, nutrient)}
      </Text>
      {pct != null && (
        <Text
          style={[
            styles.pillPercent,
            { color: isDark ? Ink.dark.secondary : Ink.light.secondary },
          ]}
        >
          {`${pct}% DV`}
        </Text>
      )}
    </HapticTouchableOpacity>
  );
}

// DS7.1 — every value below sources from constants/tokens.
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Space['5'],
    gap: Space['3'],
    paddingVertical: Space['1'],
  },
  pill: {
    paddingHorizontal: Space['4'] - 2, // 14 keeps the original visual rhythm
    paddingVertical: Space['3'] - 2, // 10
    borderRadius: Radius.card,
    minWidth: 92,
  },
  pillLabel: {
    fontFamily: Type.eyebrow.fontFamily,
    fontSize: Type.eyebrow.fontSize,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  pillValue: {
    fontFamily: Type.bodyLg.fontFamily,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  pillPercent: {
    fontFamily: Type.eyebrow.fontFamily,
    fontSize: 11,
    marginTop: 2,
  },
});
