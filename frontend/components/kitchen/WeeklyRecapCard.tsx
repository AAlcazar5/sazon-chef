// frontend/components/kitchen/WeeklyRecapCard.tsx
// ROADMAP 4.0 Tier C9 frontend — Weekly recap card.
//
// Spotify-Wrapped-toned summary of the week's cooks, cuisines, top
// ingredient, and discovery moment. Lives in Kitchen → Stories. Lifestyle
// voice — celebrate the variety, never scold the gaps.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { weeklyRecapApi, type WeeklyRecapPayload } from '../../lib/api';

export default function WeeklyRecapCard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [recap, setRecap] = useState<WeeklyRecapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await weeklyRecapApi.fetchThisWeek();
        if (!cancelled) {
          setRecap((response.data as WeeklyRecapPayload) ?? null);
        }
      } catch {
        if (!cancelled) setErrored(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || errored || !recap) {
    return null;
  }

  const cardBg = isDark ? PastelDark.lavender : Pastel.lavender;
  const accent = Accent.lavender;
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const isQuiet = recap.cookCount === 0;

  return (
    <View
      testID="weekly-recap-card"
      accessibilityLabel={`Weekly recap — ${recap.cookCount} cooks across ${recap.cuisineCount} cuisines this week`}
      accessibilityRole="summary"
      style={[styles.card, { backgroundColor: cardBg }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: accent }]}>THIS WEEK · WRAPPED</Text>
        <Ionicons name="sparkles" size={14} color={accent} />
      </View>

      {isQuiet ? (
        <Text style={[styles.body, { color: textSecondary }]}>
          A quiet week — no cooks logged. Tomorrow's a fresh start.
        </Text>
      ) : (
        <View style={styles.statsBlock}>
          <View style={styles.statRow}>
            <Text style={[styles.statValue, { color: textPrimary }]}>{recap.cookCount}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>plates cooked</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statValue, { color: textPrimary }]}>{recap.cuisineCount}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>cuisines explored</Text>
          </View>
        </View>
      )}

      {recap.topCuisine && (
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: accent }]}>TOP CUISINE</Text>
          <Text style={[styles.rowValue, { color: textPrimary }]}>
            {recap.topCuisine.cuisine}{' '}
            <Text style={[styles.rowDetail, { color: textSecondary }]}>({recap.topCuisine.count}×)</Text>
          </Text>
        </View>
      )}

      {recap.topIngredient && (
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: accent }]}>TOP INGREDIENT</Text>
          <Text style={[styles.rowValue, { color: textPrimary }]}>
            {recap.topIngredient.name}{' '}
            <Text style={[styles.rowDetail, { color: textSecondary }]}>
              ({recap.topIngredient.count}×)
            </Text>
          </Text>
        </View>
      )}

      {recap.topNutrient && (
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: accent }]}>TOP NUTRIENT</Text>
          <Text style={[styles.rowValue, { color: textPrimary }]}>
            {recap.topNutrient.name}{' '}
            <Text style={[styles.rowDetail, { color: textSecondary }]}>
              ({Math.round(recap.topNutrient.percentOfTarget * 100)}% of target)
            </Text>
          </Text>
        </View>
      )}

      {recap.discovery && (
        <View style={[styles.discoveryBlock, { borderColor: accent }]}>
          <Ionicons name="compass-outline" size={16} color={accent} />
          <Text style={[styles.discoveryText, { color: textPrimary }]} numberOfLines={3}>
            {recap.discovery}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  body: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  statsBlock: {
    flexDirection: 'row',
    gap: 24,
    marginVertical: 4,
  },
  statRow: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 32,
    letterSpacing: -1,
  },
  statLabel: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  row: {
    gap: 2,
  },
  rowLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  rowValue: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  rowDetail: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    textTransform: 'none',
  },
  discoveryBlock: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  discoveryText: {
    flex: 1,
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});
