// frontend/components/today/NutritionStrip.tsx
// ROADMAP 4.0 D14 — daily nutrient roll-up for the Today screen.
//
// Six pills horizontally scrolling. Tap any pill → opens the day's
// full nutrition recap. Hidden when nutritionUIDensity === 'minimal'.
// Voice: discovery only — "today's plate hit 14 mg iron" never
// "you're low on iron".

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
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
  if (pills.length === 0) {
    return (
      <View testID="nutrition-strip-empty" style={styles.emptyWrap}>
        <Text
          style={[
            styles.emptyText,
            { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary },
          ]}
        >
          Cook a meal — today's nutrition story starts here.
        </Text>
      </View>
    );
  }

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
  const tint = isDark ? PastelDark.sage : Pastel.sage;

  return (
    <HapticTouchableOpacity
      testID={`nutrition-pill-${nutrient}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}: ${formatNutrientValue(value, nutrient)}${pct ? `, ${pct}% daily value` : ''}`}
      style={[styles.pill, { backgroundColor: tint }]}
    >
      <Text style={[styles.pillLabel, { color: Accent.sage }]}>{meta.label}</Text>
      <Text
        style={[
          styles.pillValue,
          { color: isDark ? DarkColors.text.primary : Colors.text.primary },
        ]}
      >
        {formatNutrientValue(value, nutrient)}
      </Text>
      {pct != null && (
        <Text
          style={[
            styles.pillPercent,
            { color: isDark ? DarkColors.text.secondary : Colors.text.secondary },
          ]}
        >
          {`${pct}% DV`}
        </Text>
      )}
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 92,
  },
  pillLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  pillValue: {
    fontFamily: EditorialFontFamily.display.medium,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  pillPercent: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 11,
    marginTop: 2,
  },
  emptyWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyText: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
