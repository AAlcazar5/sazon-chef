// P1 retention — "Sazon knows you as…" identity surface.
//
// Renders 3–5 short identity tags derived from cooking signals already
// loaded via useCookingJourney. This is the screen people screenshot —
// the joy-bar "they get me" moment. Lifestyle voice, never coachy.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import { EditorialFontFamily } from '../../constants/Typography';
import { useCookingJourney } from '../../hooks/useCookingJourney';
import { deriveIdentity } from '../../lib/identityTags';

interface SazonIdentityCardProps {
  testID?: string;
}

export default function SazonIdentityCard({
  testID,
}: SazonIdentityCardProps): React.ReactElement | null {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { stats, progress, loading } = useCookingJourney();

  if (loading) return null;
  const identity = deriveIdentity({ stats, progress });
  if (identity.tags.length === 0) return null;

  const bg = isDark ? '#1F2937' : '#FFFFFF';
  const accent = Accent.lavender;
  const chipBg = isDark ? PastelDark.lavender : Pastel.lavender;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  return (
    <View
      testID={testID ?? 'sazon-identity-card'}
      accessibilityRole="summary"
      accessibilityLabel={`Sazon knows you as: ${identity.caption ?? ''}`}
      style={[styles.card, { backgroundColor: bg }, Shadows.MD]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: chipBg }]}>
          <Ionicons name="sparkles-outline" size={16} color={accent} />
        </View>
        <Text style={[styles.headline, { color: text }]}>Sazon knows you as…</Text>
      </View>
      <View
        testID="sazon-identity-card-tags"
        style={styles.tagsRow}
      >
        {identity.tags.map((tag) => (
          <View
            key={tag}
            testID={`sazon-identity-tag-${tag}`}
            style={[styles.chip, { backgroundColor: chipBg }]}
          >
            <Text style={[styles.chipLabel, { color: text }]}>{tag}</Text>
          </View>
        ))}
      </View>
      {identity.caption ? (
        <Text style={[styles.caption, { color: sub }]} numberOfLines={3}>
          {identity.caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.card,
    padding: Spacing.md + 2,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    gap: Spacing.sm + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  chipLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  caption: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
