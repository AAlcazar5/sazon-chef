// frontend/components/recipe/DrinkPairingFooter.tsx
// ROADMAP 4.0 F8 — Drink pairing footer on recipe detail.
//
// Lifestyle-voiced pairing card. "Drinks well with…" — never required.
// Hides cleanly while loading and on fetch error so the recipe detail
// scroll never gets a placeholder block.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { drinkPairingApi, type DrinkPairingPayload } from '../../lib/api';

interface DrinkPairingFooterProps {
  cuisine: string | null | undefined;
}

export default function DrinkPairingFooter({ cuisine }: DrinkPairingFooterProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!cuisine) {
      setSuggestions(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await drinkPairingApi.get(cuisine);
        const payload = (res?.data ?? res) as DrinkPairingPayload | undefined;
        if (!cancelled) {
          setSuggestions(payload?.suggestions ?? null);
        }
      } catch {
        if (!cancelled) setErrored(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cuisine]);

  if (errored || !suggestions || suggestions.length === 0) {
    return null;
  }

  const cardBg = isDark ? PastelDark.blush : Pastel.blush;
  const accent = Accent.blush;
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  return (
    <View
      testID="drink-pairing-footer"
      accessibilityLabel="Drinks well with"
      style={[styles.card, { backgroundColor: cardBg }]}
    >
      <View style={styles.headerRow}>
        <Ionicons name="wine-outline" size={14} color={accent} />
        <Text style={[styles.eyebrow, { color: accent }]}>DRINKS WELL WITH</Text>
      </View>
      {suggestions.map((line, idx) => (
        <View key={idx} style={styles.line}>
          <Text style={[styles.bullet, { color: accent }]}>·</Text>
          <Text style={[styles.lineText, { color: idx === 0 ? textPrimary : textSecondary }]}>
            {line}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 18,
    lineHeight: 18,
    fontFamily: EditorialFontFamily.body.bold,
  },
  lineText: {
    flex: 1,
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});
