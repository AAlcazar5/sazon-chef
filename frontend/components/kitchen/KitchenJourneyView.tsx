// frontend/components/kitchen/KitchenJourneyView.tsx
// ROADMAP 4.0 Tier A3-c — Kitchen Journey view.
//
// The visual story of who the user has become as a cook. Per the IA spec
// (`plans/ia-spec.md` Tab 3 → Journey), this view stitches together:
// - cuisine map (currently a chip list — visual world map deferred)
// - stats grid + skill tier (existing CookingJourneyCard, repositioned A3-e)
// - Kitchen IQ wall (existing component)
// - "Your arc" — first plate vs. latest plate side-by-side

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCookingJourney } from '../../hooks/useCookingJourney';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { Shadows } from '../../constants/Shadows';
import CookingJourneyCard from '../profile/CookingJourneyCard';
import KitchenIQSection from '../profile/KitchenIQSection';

interface KitchenJourneyViewProps {
  isDark: boolean;
}

export default function KitchenJourneyView({ isDark }: KitchenJourneyViewProps) {
  useTheme();
  const { stats } = useCookingJourney();

  // Cuisine map → sky (exploration); arc → golden (growth).
  // Lavender stays reserved for WeeklyRecapCard so cards across views don't bleed.
  const accent = Accent.sky;
  const cardBg = isDark ? PastelDark.sky : Pastel.sky;
  const arcBg = isDark ? PastelDark.golden : Pastel.golden;
  const arcAccent = Accent.golden;
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  if (!stats || stats.cuisinesExplored.length === 0) {
    return (
      <View style={styles.quiet}>
        <Text style={[styles.quietText, { color: textSecondary }]}>
          Start cooking and your map will fill in.
        </Text>
      </View>
    );
  }

  const cuisines = stats.cuisinesExplored;
  const firstCuisine = stats.firstCookedCuisines[0];
  const latestCuisine = stats.firstCookedCuisines[stats.firstCookedCuisines.length - 1];
  const showArc = stats.firstCookedCuisines.length >= 2;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      testID="kitchen-journey-view"
    >
      {/* Cuisine Map */}
      <View style={[styles.card, Shadows.SM as object, { backgroundColor: cardBg }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.eyebrow, { color: accent }]}>CUISINE MAP</Text>
          <Text style={[styles.eyebrow, { color: textSecondary }]}>
            {cuisines.length} CUISINES
          </Text>
        </View>
        <View style={styles.cuisineWrap}>
          {cuisines.map((cuisine) => (
            <View
              key={cuisine}
              style={[
                styles.cuisineChip,
                { backgroundColor: isDark ? '#374151' : '#FFFFFF' },
              ]}
            >
              <Text style={[styles.cuisineLabel, { color: textPrimary }]}>{cuisine}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Stats + Skill Tier (CookingJourneyCard) */}
      <CookingJourneyCard testID="kitchen-journey-stats-card" />

      {/* Kitchen IQ wall */}
      <KitchenIQSection testID="kitchen-journey-iq" />

      {/* Your arc */}
      {showArc && firstCuisine && latestCuisine && (
        <View style={[styles.card, Shadows.SM as object, { backgroundColor: arcBg }]}>
          <Text style={[styles.eyebrow, { color: arcAccent }]}>YOUR ARC</Text>
          <View style={styles.arcRow}>
            <View style={styles.arcSlot}>
              <Text style={[styles.arcLabel, { color: textSecondary }]}>First plate</Text>
              <Text style={[styles.arcCuisine, { color: textPrimary }]}>
                {firstCuisine.cuisine}
              </Text>
            </View>
            <Text style={[styles.arcArrow, { color: arcAccent }]}>→</Text>
            <View style={styles.arcSlot}>
              <Text style={[styles.arcLabel, { color: textSecondary }]}>Latest plate</Text>
              <Text style={[styles.arcCuisine, { color: textPrimary }]}>
                {latestCuisine.cuisine}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
    gap: 16,
  },
  quiet: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  quietText: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    gap: 12,
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
  cuisineWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cuisineChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  cuisineLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
  },
  arcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  arcSlot: {
    flex: 1,
    gap: 4,
  },
  arcLabel: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  arcCuisine: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  arcArrow: {
    fontSize: 22,
    fontFamily: EditorialFontFamily.body.bold,
  },
});
