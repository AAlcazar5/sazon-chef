// frontend/components/meal-plan/PlanIQCard.tsx
// ROADMAP 4.0 WK14.1 — Weekly "Plan IQ" editorial summary card.
//
// Rendered on the Week screen (Sunday). Summarizes the week's plan in 4
// stat rows: cuisine lean, top nutrient, pantry-reuse %, carry-over plays.
// Lifestyle voice: "a strong rhythm" never "you achieved 67%."
//
// Cold-start: when N2.1 signal-coverage tier is `cold` (< 3 cooked meals
// this week), render nothing — the card needs enough cooks to feel earned.
// Caller is responsible for the cold-start guard (passes `summary` only
// when the user is at `mid` or `high`).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { FontSize } from '../../constants/Typography';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';

export interface PlanIQSummary {
  /** "Mediterranean (3 cuisines)" — caller pre-formats. */
  cuisineLean: string;
  /** "magnesium-rich" / "iron-rich" — caller pre-formats. */
  topNutrient: string;
  /** 0..1 pantry-reuse fraction — rendered as percentage. */
  pantryReuseRatio: number;
  /** N "cook-once-eat-twice" plays this week. */
  carryOverCount: number;
  /** Lifestyle-voice tagline ("a strong rhythm" / "a curious week"). */
  rhythmTagline: string;
}

interface PlanIQCardProps {
  /** When omitted, the card does NOT render (cold-start guard). */
  summary?: PlanIQSummary;
  /** Optional share-as-image handler. */
  onShare?: () => void;
}

function PlanIQCard({ summary, onShare }: PlanIQCardProps) {
  const { isDark } = useTheme();

  if (!summary) return null;

  const tint = isDark ? PastelDark.peach : Pastel.peach;
  const accent = Accent.peach;
  const textColor = isDark ? Colors.text.inverse : Colors.text.primary;
  const subTextColor = isDark ? Colors.text.tertiary : Colors.text.secondary;
  const pantryPct = Math.round(summary.pantryReuseRatio * 100);

  return (
    <View
      testID="plan-iq-card"
      style={[styles.container, { backgroundColor: tint }, Shadows.MD]}
    >
      <Text style={[styles.headline, { color: textColor }]}>
        Plan IQ
      </Text>
      <Text style={[styles.tagline, { color: subTextColor }]}>
        {summary.rhythmTagline}
      </Text>

      <View style={styles.statsGrid}>
        <View testID="plan-iq-stat-cuisine" style={styles.stat}>
          <Text style={[styles.statLabel, { color: subTextColor }]}>Lean</Text>
          <Text style={[styles.statValue, { color: textColor }]}>
            {summary.cuisineLean}
          </Text>
        </View>
        <View testID="plan-iq-stat-nutrient" style={styles.stat}>
          <Text style={[styles.statLabel, { color: subTextColor }]}>Top nutrient</Text>
          <Text style={[styles.statValue, { color: textColor }]}>
            {summary.topNutrient}
          </Text>
        </View>
        <View testID="plan-iq-stat-pantry" style={styles.stat}>
          <Text style={[styles.statLabel, { color: subTextColor }]}>Pantry reuse</Text>
          <Text style={[styles.statValue, { color: textColor }]}>
            {pantryPct}%
          </Text>
        </View>
        <View testID="plan-iq-stat-carryover" style={styles.stat}>
          <Text style={[styles.statLabel, { color: subTextColor }]}>Cook-once plays</Text>
          <Text style={[styles.statValue, { color: textColor }]}>
            {summary.carryOverCount}
          </Text>
        </View>
      </View>

      {onShare ? (
        <HapticTouchableOpacity
          testID="plan-iq-share"
          accessibilityRole="button"
          accessibilityLabel="Share this week's Plan IQ as an image"
          onPress={onShare}
          style={[styles.shareBtn, { backgroundColor: accent }]}
        >
          <Text style={styles.shareText}>Share this week</Text>
        </HapticTouchableOpacity>
      ) : null}
    </View>
  );
}

export default PlanIQCard;

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    margin: Spacing.md,
    borderRadius: BorderRadius.card,
    gap: Spacing.sm,
  },
  headline: {
    fontSize: FontSize.lg,
    fontFamily: 'Fraunces_700Bold',
  },
  tagline: {
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stat: {
    flex: 1,
    minWidth: '45%',
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'PlusJakartaSans_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: FontSize.md,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 2,
  },
  shareBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  shareText: {
    color: Colors.text.inverse,
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
