// frontend/components/meal-plan/WeeklyBudgetBar.tsx
// Weekly macro budget bar (Group 10G-A). Shows how much calorie/protein runway is
// left for the week and how today's adjusted target compares to the user's daily
// goal — the rollover "↑ 100 cal" / "↓ 200 cal" feedback that reassures users they
// can absorb a surplus or compensate for a deficit.

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import type { WeeklyBudgetSnapshot } from '../../hooks/useBudget';

interface WeeklyBudgetBarProps {
  budget: WeeklyBudgetSnapshot | null;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export default function WeeklyBudgetBar({ budget }: WeeklyBudgetBarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!budget) return null;

  const { remaining, daysRemaining, targets, adjusted } = budget;
  const bg = isDark ? PastelDark.sage : Pastel.sage;
  const textPrimary = isDark ? '#F5F5F5' : '#1F2937';
  const textSecondary = isDark ? '#CBD5E1' : '#475569';

  const calorieRatio = targets.weeklyCalories > 0
    ? Math.min(remaining.calories / targets.weeklyCalories, 1)
    : 0;
  const proteinRatio = targets.weeklyProtein > 0
    ? Math.min(remaining.protein / targets.weeklyProtein, 1)
    : 0;

  const deltaCal = adjusted.deltaCalories;
  const showRollover = deltaCal !== 0;
  const isSurplus = deltaCal > 0;
  const rolloverColor = isSurplus ? Accent.sage : Accent.peach;
  const rolloverIcon: keyof typeof Ionicons.glyphMap = isSurplus ? 'arrow-up' : 'arrow-down';
  const rolloverLabel = isSurplus
    ? `surplus +${deltaCal} cal carried into today`
    : `deficit ${deltaCal} cal to make up today`;

  const a11yRoot = `Weekly budget: ${formatNumber(remaining.calories)} calories and ${formatNumber(remaining.protein)} grams of protein remaining across ${daysRemaining} days.`;

  return (
    <View
      testID="weekly-budget-bar"
      accessibilityLabel={a11yRoot}
      accessible
      style={[styles.container, { backgroundColor: bg }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: textPrimary }]}>Weekly Budget</Text>
        {showRollover && (
          <View
            testID="weekly-budget-rollover"
            accessibilityLabel={rolloverLabel}
            style={[styles.rollover, { backgroundColor: rolloverColor }]}
          >
            <Ionicons name={rolloverIcon} size={12} color="#FFFFFF" />
            <Text style={styles.rolloverText}>
              {isSurplus ? '+' : ''}{deltaCal} cal today
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.remaining, { color: textPrimary }]}>
        {formatNumber(remaining.calories)} cal
        <Text style={[styles.remainingSub, { color: textSecondary }]}>
          {' '}across {daysRemaining} days
        </Text>
      </Text>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${calorieRatio * 100}%`, backgroundColor: Accent.sage }]} />
      </View>

      <View style={styles.proteinRow}>
        <Text style={[styles.proteinLabel, { color: textSecondary }]}>Protein</Text>
        <Text style={[styles.proteinValue, { color: textPrimary }]}>
          {formatNumber(remaining.protein)} g remaining
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${proteinRatio * 100}%`, backgroundColor: Accent.blush }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rollover: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
  },
  rolloverText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  remaining: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  remainingSub: {
    fontSize: 14,
    fontWeight: '500',
  },
  barTrack: {
    height: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 100,
  },
  proteinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  proteinLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  proteinValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
