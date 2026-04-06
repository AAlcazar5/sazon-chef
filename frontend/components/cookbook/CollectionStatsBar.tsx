// frontend/components/cookbook/CollectionStatsBar.tsx
// Compact stats bar shown when a collection filter is active.
// Pure presentational — receives already-filtered recipes and computes stats.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

interface StatsRecipe {
  cookTime?: number;
  calories?: number;
  protein?: number;
  cuisine?: string;
}

interface CollectionStatsBarProps {
  recipes: StatsRecipe[] | undefined;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function topMode(values: string[]): string | null {
  if (values.length === 0) return null;
  const freq = new Map<string, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  freq.forEach((count, key) => { if (count > bestCount) { bestCount = count; best = key; } });
  return best;
}

function CollectionStatsBar({ recipes }: CollectionStatsBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const stats = useMemo(() => {
    if (!recipes || recipes.length === 0) return null;
    const cookTimes = recipes.map(r => r.cookTime).filter((v): v is number => typeof v === 'number');
    const proteins = recipes.map(r => r.protein).filter((v): v is number => typeof v === 'number');
    const cuisines = recipes.map(r => r.cuisine).filter((v): v is string => typeof v === 'string' && v.length > 0);
    return {
      count: recipes.length,
      avgCookTime: avg(cookTimes),
      avgProtein: avg(proteins),
      topCuisine: topMode(cuisines),
    };
  }, [recipes]);

  if (!stats) return null;

  const pill = (icon: string, value: string, label?: string) => (
    <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
      <Text style={styles.pillIcon}>{icon}</Text>
      <Text style={[styles.pillValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>{value}</Text>
      {label && <Text style={[styles.pillLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{label}</Text>}
    </View>
  );

  return (
    <View style={styles.row} testID="collection-stats-bar" accessibilityLabel="Collection statistics">
      {pill('📋', String(stats.count), stats.count === 1 ? 'recipe' : 'recipes')}
      {stats.avgCookTime > 0 && pill('⏱', `${stats.avgCookTime} min`)}
      {stats.avgProtein > 0 && pill('💪', `${stats.avgProtein}g`, 'protein')}
      {stats.topCuisine && pill('🌍', stats.topCuisine)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  pillIcon: {
    fontSize: 12,
  },
  pillValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default React.memo(CollectionStatsBar);
