// frontend/components/today/CulturalFluencyCard.tsx
// ROADMAP 4.0 Tier J17.1 — Stories/Journey weekly cultural-fluency beat.
//
// Renders the cuisine + curated "why this works" insight returned by
// `culturalFluencyInsightService`. Lavender pastel surface with Fraunces
// display headline. Discovery voice — never prescription. The peak moment
// is the user catching themselves recognizing the pattern.
//
// Banned-vocab discipline (J17/J18): no health/diet framing in any chrome
// string. Eyebrow says "THIS WEEK", not "THIS WEEK'S GOAL".

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

interface CulturalFluencyCardProps {
  /** Canonical cuisine slug (lowercase) — empty string hides the card. */
  cuisine: string;
  /** Curated insight text — null hides the card. */
  insight: string | null;
  /** Tap handler for share-as-image affordance. */
  onShare: () => void;
}

export default function CulturalFluencyCard({
  cuisine,
  insight,
  onShare,
}: CulturalFluencyCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!insight || !cuisine) return null;

  const display = capitalize(cuisine);
  const a11yLabel = `${display}: ${insight}`;

  return (
    <View
      testID="cultural-fluency-card"
      accessibilityLabel={a11yLabel}
      accessibilityRole="text"
      style={[
        styles.card,
        { backgroundColor: isDark ? PastelDark.lavender : Pastel.lavender },
      ]}
    >
      <Text style={[styles.eyebrow, { color: Accent.lavender }]}>
        THIS WEEK
      </Text>
      <Text style={[styles.cuisineLine, { color: Accent.lavender }]}>
        {display}
      </Text>
      <Text style={[styles.insightLine, { color: Accent.lavender }]}>
        {insight}
      </Text>
      <View style={styles.footerRow}>
        <HapticTouchableOpacity
          testID="cultural-fluency-card-share"
          onPress={onShare}
          accessibilityLabel="Share this insight"
          accessibilityRole="button"
          pressedScale={0.97}
          style={styles.shareButton}
        >
          <Ionicons
            name="share-outline"
            size={16}
            color={Accent.lavender}
            style={styles.shareIcon}
          />
          <Text style={[styles.shareText, { color: Accent.lavender }]}>
            Share
          </Text>
        </HapticTouchableOpacity>
      </View>
    </View>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 6,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    opacity: 0.85,
  },
  cuisineLine: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 22,
    lineHeight: 26,
    marginTop: 2,
  },
  insightLine: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    opacity: 0.95,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  shareIcon: {
    marginRight: 6,
  },
  shareText: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
  },
});
