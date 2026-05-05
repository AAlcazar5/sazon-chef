// frontend/components/today/SazonQuipCard.tsx
// ROADMAP 4.0 Tier J7 — Sazon daily quip card.
//
// One rotating culinary aphorism / observation / personality line at the top of
// Today, fetched from /api/quips/today (deterministic by date). Lifestyle voice;
// no verdict tone. Hides silently while loading and on API error.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { quipsApi, type SazonQuipPayload } from '../../lib/api';

type QuipCategory = SazonQuipPayload['quip']['category'];
type QuipShape = SazonQuipPayload['quip'];

interface SazonQuipCardProps {
  /** Optional tap handler — receives the quip so the caller can journal it. */
  onPress?: (quip: QuipShape) => void;
}

const CATEGORY_TINT: Record<QuipCategory, { bg: keyof typeof Pastel; accent: keyof typeof Accent; eyebrow: string }> = {
  proverb: { bg: 'lavender', accent: 'lavender', eyebrow: 'PROVERB' },
  observation: { bg: 'sage', accent: 'sage', eyebrow: 'OBSERVATION' },
  personality: { bg: 'peach', accent: 'peach', eyebrow: 'SAZON SAYS' },
};

export default function SazonQuipCard({ onPress }: SazonQuipCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [quip, setQuip] = useState<QuipShape | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await quipsApi.today();
        const payload = (res?.data ?? res) as SazonQuipPayload | undefined;
        if (!cancelled && payload?.quip) {
          setQuip(payload.quip);
        }
      } catch {
        // Best-effort — never block Today on a missing quip.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!quip) return null;

  const tint = CATEGORY_TINT[quip.category] ?? CATEGORY_TINT.personality;
  const cardBg = isDark ? PastelDark[tint.bg] : Pastel[tint.bg];
  const accent = Accent[tint.accent];
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;

  const handlePress = () => {
    if (onPress) onPress(quip);
  };

  return (
    <HapticTouchableOpacity
      testID="sazon-quip-card"
      onPress={handlePress}
      accessibilityLabel={`${tint.eyebrow}: ${quip.text}`}
      accessibilityRole="summary"
      pressedScale={0.99}
      style={[styles.card, { backgroundColor: cardBg }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: accent }]}>{tint.eyebrow}</Text>
        <Ionicons name="leaf-outline" size={13} color={accent} />
      </View>
      <Text style={[styles.body, { color: text }]} numberOfLines={3}>
        {quip.text}
      </Text>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 6,
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
  body: {
    fontFamily: EditorialFontFamily.display.regular,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
});
