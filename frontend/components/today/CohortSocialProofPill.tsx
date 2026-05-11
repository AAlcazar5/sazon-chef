// frontend/components/today/CohortSocialProofPill.tsx
// ROADMAP 4.0 F9 — Cohort social proof.
//
// Compact pill on Today: "Persian is trending in your taste cluster." Hides
// silently while loading and when the backend has no signal yet (cold start
// + small cohorts).
//
// HX3.2 follow-up: data fetch lifted into useCohortSocialProof so the
// parent DiscoveryStrip can read the SAME signal for hasData computation
// — keeping the strip from reserving an empty card slot when the pill
// will ultimately render null.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { useCohortSocialProof } from '../../hooks/useCohortSocialProof';

export default function CohortSocialProofPill() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { proof } = useCohortSocialProof();

  if (!proof) return null;

  const bg = isDark ? PastelDark.lavender : Pastel.lavender;
  const accent = Accent.lavender;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;

  return (
    <View
      testID="cohort-social-proof-pill"
      accessibilityLabel={proof.copy}
      accessibilityRole="summary"
      style={[styles.pill, { backgroundColor: bg }]}
    >
      <Ionicons name="trending-up" size={13} color={accent} />
      <Text style={[styles.copy, { color: text }]} numberOfLines={2}>
        {proof.copy}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    marginHorizontal: 16,
    marginVertical: 6,
    alignSelf: 'flex-start',
  },
  copy: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
