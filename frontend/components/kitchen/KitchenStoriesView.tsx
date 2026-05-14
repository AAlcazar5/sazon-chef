// frontend/components/kitchen/KitchenStoriesView.tsx
// ROADMAP 4.0 Tier A3-d — Kitchen Stories view.
//
// Editorial recaps of the user's cooking life. Per `plans/ia-spec.md` Tab 3 →
// Stories, this view stacks: this-week recap (existing C9 card) → this-month
// teaser → past-recaps archive. Swipeable Wrapped-style cards land in a
// follow-up — for v1 the WeeklyRecapCard already renders that visual.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import WeeklyRecapCard from './WeeklyRecapCard';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { Shadows } from '../../constants/Shadows';
import { ComponentSpacing } from '../../constants/Spacing';
import { t } from '../../lib/i18n';

interface KitchenStoriesViewProps {
  isDark: boolean;
}

export default function KitchenStoriesView({ isDark }: KitchenStoriesViewProps) {
  useTheme();
  const accent = Accent.lavender;
  // Spread distinct pastels per card so adjacent stories don't share tint.
  const monthAccent = Accent.golden;
  const monthBg = isDark ? PastelDark.golden : Pastel.golden;
  const archiveBg = isDark ? PastelDark.sky : Pastel.sky;
  const archiveAccent = Accent.sky;
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      testID="kitchen-stories-view"
    >
      {/* This week */}
      <Text style={[styles.eyebrow, { color: accent }]}>{t('kitchen.stories.thisWeek')}</Text>
      <WeeklyRecapCard />

      {/* This month teaser */}
      <View style={[styles.card, Shadows.SM as object, { backgroundColor: monthBg }]}>
        <Text style={[styles.eyebrow, { color: monthAccent }]}>{t('kitchen.stories.thisMonth')}</Text>
        <Text style={[styles.title, { color: textPrimary }]}>
          {t('kitchen.stories.monthlyBrewing')}
        </Text>
        <Text style={[styles.body, { color: textSecondary }]}>
          {t('kitchen.stories.monthlyExplanation')}
        </Text>
      </View>

      {/* Past recaps archive */}
      <View style={[styles.card, Shadows.SM as object, { backgroundColor: archiveBg }]}>
        <Text style={[styles.eyebrow, { color: archiveAccent }]}>{t('kitchen.stories.pastRecaps')}</Text>
        <Text style={[styles.body, { color: textSecondary }]}>
          Your weekly recaps will be saved here, swipeable + revisitable.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: ComponentSpacing.tabBar.scrollPaddingBottom,
    gap: 16,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    paddingHorizontal: 24,
  },
  card: {
    marginHorizontal: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    gap: 8,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});
