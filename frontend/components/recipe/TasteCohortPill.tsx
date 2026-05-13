// P4 retention — "N people with your taste cooked this" recipe-detail pill.
//
// Soft social proof. Surfaces only when there are ≥3 distinct cookers in
// the last 7 days who share the user's top cuisine. Voice rule: lifestyle
// observation, never a verdict — never "everyone's cooking this" pressure.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { recipeApi } from '../../lib/api/recipe';

interface TasteCohortPillProps {
  recipeId: string;
}

export default function TasteCohortPill({
  recipeId,
}: TasteCohortPillProps): React.ReactElement | null {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [count, setCount] = useState<number>(0);
  const [label, setLabel] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await recipeApi.getTasteCohort(recipeId);
        if (cancelled) return;
        setCount(res?.data?.cookerCount ?? 0);
        setLabel(res?.data?.cohortLabel ?? null);
      } catch {
        /* best-effort — pill is nice-to-have */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  if (!loaded) return null;
  if (count <= 0 || !label) return null;

  const bg = isDark ? PastelDark.sage : Pastel.sage;
  const accent = Accent.sage;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;

  const copy = `${count} ${label} cooks loved this in the last week`;
  const a11y = `${count} people with your taste cooked this in the last week.`;

  return (
    <View
      testID="taste-cohort-pill"
      accessibilityRole="text"
      accessibilityLabel={a11y}
      style={[styles.pill, { backgroundColor: bg }]}
    >
      <Ionicons name="people-outline" size={14} color={accent} />
      <Text style={[styles.label, { color: text }]} numberOfLines={1}>
        {copy}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  label: {
    flexShrink: 1,
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
