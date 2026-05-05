// frontend/components/today/SeasonalProduceCard.tsx
// ROADMAP 4.0 F6 — Seasonal awareness Today card.
//
// Picks one peak ingredient per calendar day from the local SEASONAL_PRODUCE
// table. Lifestyle-voiced — no nutrition framing, just "X is at peak this
// week, here's why it's interesting." Daily rotation is deterministic on
// (month, day-of-month) so users get a predictable cycle through the week.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { Shadows } from '../../constants/Shadows';
import { pickSeasonalProduce } from '../../lib/seasonalProduce';

interface SeasonalProduceCardProps {
  /** Override "today" for tests + previews. */
  asOfDate?: Date;
}

export default function SeasonalProduceCard({ asOfDate }: SeasonalProduceCardProps = {}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const pick = useMemo(() => pickSeasonalProduce(asOfDate ?? new Date()), [asOfDate]);

  if (!pick) return null;

  const cardBg = isDark ? PastelDark.sage : Pastel.sage;
  const accent = Accent.sage;
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  return (
    <View
      testID="seasonal-produce-card"
      accessibilityLabel={`In season: ${pick.name}`}
      accessibilityRole="summary"
      style={[styles.card, Shadows.SM as object, { backgroundColor: cardBg }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: accent }]}>IN SEASON</Text>
        {pick.emoji ? <Text style={styles.emoji}>{pick.emoji}</Text> : null}
      </View>
      <Text
        testID="seasonal-produce-name"
        style={[styles.name, { color: textPrimary }]}
      >
        {pick.name}
      </Text>
      <Text style={[styles.hook, { color: textSecondary }]} numberOfLines={3}>
        {pick.hook}
      </Text>
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
    gap: 4,
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
  emoji: {
    fontSize: 16,
  },
  name: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
    letterSpacing: -0.3,
    textTransform: 'capitalize',
  },
  hook: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
