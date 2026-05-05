// frontend/components/today/TodayDiscoveryCard.tsx
// ROADMAP 4.0 Tier A1-c — Today rotating discovery card.
//
// One card per day, drawn from user state via matchFoodIntelTips (existing).
// Editorial layout — Fraunces title + body in body font + category eyebrow.
// Lifestyle voice — discovery, not optimization.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export interface TodayDiscoveryTip {
  id: string;
  category:
    | 'superfood'
    | 'nutrient'
    | 'technique'
    | 'myth_bust'
    | 'pairing'
    | 'ingredient'
    | 'cultural'
    | 'arc';
  title: string;
  body: string;
}

interface TodayDiscoveryCardProps {
  /** The tip to surface. null hides the card. */
  tip: TodayDiscoveryTip | null;
  /** Tap handler — receives the tip id so engagement can be recorded. */
  onPress: (tipId: string) => void;
}

const CATEGORY_TINT: Record<TodayDiscoveryTip['category'], { bg: keyof typeof Pastel; accent: keyof typeof Accent; eyebrow: string }> = {
  superfood: { bg: 'sage', accent: 'sage', eyebrow: 'SUPERFOOD' },
  nutrient: { bg: 'sage', accent: 'sage', eyebrow: 'NUTRIENT' },
  technique: { bg: 'peach', accent: 'peach', eyebrow: 'TECHNIQUE' },
  myth_bust: { bg: 'lavender', accent: 'lavender', eyebrow: 'MYTH' },
  pairing: { bg: 'golden', accent: 'golden', eyebrow: 'PAIRING' },
  ingredient: { bg: 'sky', accent: 'sky', eyebrow: 'INGREDIENT' },
  cultural: { bg: 'blush', accent: 'blush', eyebrow: 'CULTURAL' },
  arc: { bg: 'lavender', accent: 'lavender', eyebrow: 'YOUR ARC' },
};

export default function TodayDiscoveryCard({ tip, onPress }: TodayDiscoveryCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!tip) {
    return null;
  }

  const tint = CATEGORY_TINT[tip.category] ?? CATEGORY_TINT.pairing;
  const cardBg = isDark ? PastelDark[tint.bg] : Pastel[tint.bg];

  return (
    <HapticTouchableOpacity
      testID="today-discovery-card"
      onPress={() => onPress(tip.id)}
      accessibilityLabel={`${tint.eyebrow}: ${tip.title}`}
      accessibilityRole="button"
      pressedScale={0.99}
      style={[styles.card, { backgroundColor: cardBg }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: Accent[tint.accent] }]}>{tint.eyebrow}</Text>
        <Ionicons name="sparkles" size={14} color={Accent[tint.accent]} />
      </View>
      <Text
        style={[
          styles.title,
          { color: isDark ? DarkColors.text.primary : Colors.text.primary },
        ]}
        numberOfLines={2}
      >
        {tip.title}
      </Text>
      <Text
        style={[
          styles.body,
          { color: isDark ? DarkColors.text.secondary : Colors.text.secondary },
        ]}
        numberOfLines={3}
      >
        {tip.body}
      </Text>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
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
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  body: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
