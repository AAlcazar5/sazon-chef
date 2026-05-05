// frontend/components/recipe/NutritionCard.tsx
// ROADMAP 4.0 D14 — recipe-detail nutrient discovery card.
//
// Renders top-N nutrients (per nutritionUIDensity) with DV% bars. Tapping
// "See all" expands to the full ~33 nutrients grouped by category.
// Voice: discovery, never verdict — "this plate hit 18% of your iron"
// not "you need more iron".

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import {
  NUTRIENT_META,
  RECIPE_CORE_NUTRIENTS,
  pickSurpriseNutrient,
  recipeNutrientCountForDensity,
  dvPercent,
  formatNutrientValue,
  type NutrientKey,
  type NutritionUIDensity,
} from '../../constants/Nutrients';

export interface NutritionAggregate {
  ingredientCoverage?: number;
  [nutrient: string]: number | null | undefined;
}

interface NutritionCardProps {
  recipeId: string;
  aggregate: NutritionAggregate | null;
  density?: NutritionUIDensity;
}

const APPROXIMATE_THRESHOLD = 0.7;

export default function NutritionCard({
  recipeId,
  aggregate,
  density = 'macros + micros',
}: NutritionCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(false);

  const featured = useMemo<NutrientKey[]>(() => {
    const max = recipeNutrientCountForDensity(density);
    if (max === 0) return [];
    const core = RECIPE_CORE_NUTRIENTS.slice(0, Math.max(0, max - 1));
    const surprise = pickSurpriseNutrient(recipeId, new Set(core));
    return [...core, surprise].slice(0, max);
  }, [recipeId, density]);

  if (!aggregate || density === 'minimal') {
    return null;
  }

  const coverage = aggregate.ingredientCoverage ?? 1;
  const showApproximate = coverage > 0 && coverage < APPROXIMATE_THRESHOLD;

  const allKeys: NutrientKey[] = (Object.keys(NUTRIENT_META) as NutrientKey[]).filter(
    key => typeof aggregate[key] === 'number',
  );

  const visibleKeys = expanded ? allKeys : featured;

  return (
    <View
      testID="nutrition-card"
      style={[
        styles.card,
        { backgroundColor: isDark ? DarkColors.card : '#FFFFFF' },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: isDark ? DarkColors.text.primary : Colors.text.primary },
          ]}
        >
          What's in this plate
        </Text>
        {showApproximate && (
          <View
            testID="nutrition-card-approximate"
            style={[styles.pill, { backgroundColor: isDark ? PastelDark.golden : Pastel.golden }]}
          >
            <Text style={[styles.pillLabel, { color: Accent.golden }]}>Approximate</Text>
          </View>
        )}
      </View>

      <View style={styles.list}>
        {visibleKeys.map(key => (
          <NutrientRow
            key={key}
            nutrient={key}
            value={(aggregate[key] as number) ?? null}
            isDark={isDark}
          />
        ))}
      </View>

      {!expanded && allKeys.length > featured.length && (
        <HapticTouchableOpacity
          testID="nutrition-card-see-all"
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel="See all nutrients"
          style={styles.seeAllRow}
        >
          <Text style={[styles.seeAllLabel, { color: Accent.sage }]}>See all nutrients</Text>
        </HapticTouchableOpacity>
      )}

      {expanded && (
        <HapticTouchableOpacity
          testID="nutrition-card-collapse"
          onPress={() => setExpanded(false)}
          accessibilityRole="button"
          accessibilityLabel="Collapse nutrients"
          style={styles.seeAllRow}
        >
          <Text style={[styles.seeAllLabel, { color: Accent.sage }]}>Show less</Text>
        </HapticTouchableOpacity>
      )}
    </View>
  );
}

interface NutrientRowProps {
  nutrient: NutrientKey;
  value: number | null;
  isDark: boolean;
}

function NutrientRow({ nutrient, value, isDark }: NutrientRowProps) {
  const meta = NUTRIENT_META[nutrient];
  const pct = dvPercent(value, nutrient);
  const barWidth = pct == null ? 0 : Math.min(100, pct);

  return (
    <View testID={`nutrition-row-${nutrient}`} style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
          {meta.label}
        </Text>
        <Text style={[styles.rowValue, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
          {formatNutrientValue(value, nutrient)}
          {pct != null && <Text style={styles.rowPercent}>{`  ${pct}% DV`}</Text>}
        </Text>
      </View>
      {pct != null && (
        <View
          testID={`nutrition-row-${nutrient}-bar`}
          style={[styles.barTrack, { backgroundColor: isDark ? '#3a3a3a' : '#F1F1F1' }]}
        >
          <View
            style={[
              styles.barFill,
              {
                width: `${barWidth}%`,
                backgroundColor: barColorFor(nutrient),
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

function barColorFor(nutrient: NutrientKey): string {
  const group = NUTRIENT_META[nutrient].group;
  if (group === 'macro') return Accent.peach;
  if (group === 'mineral') return Accent.sage;
  if (group === 'vitamin') return Accent.lavender;
  if (group === 'omega') return Accent.sky;
  if (group === 'fat') return Accent.golden;
  return Accent.blush;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontFamily: EditorialFontFamily.display.medium,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  pillLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 11,
  },
  list: {
    gap: 10,
  },
  row: {
    gap: 6,
  },
  rowText: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
  },
  rowValue: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
  },
  rowPercent: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 11,
    color: Accent.sage,
  },
  barTrack: {
    height: 4,
    borderRadius: 100,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 100,
  },
  seeAllRow: {
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  seeAllLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
  },
});
