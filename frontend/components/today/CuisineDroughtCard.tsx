// P1 retention — cuisine-drought Today card.
//
// Companion to the cuisine-drought push: surfaces the same signal in-app so
// users who tap into Sazon (instead of tapping the push) get the nudge too.
// Auto-hides when no drought exists or the API errors.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { todayApi, type CuisineDroughtPayload } from '../../lib/api/today';

const titleCase = (s: string): string => {
  if (!s) return '';
  return s
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
};

interface CuisineDroughtCardProps {
  onPress?: (cuisine: string) => void;
}

export default function CuisineDroughtCard({ onPress }: CuisineDroughtCardProps): React.ReactElement | null {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [payload, setPayload] = useState<CuisineDroughtPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await todayApi.drought();
        if (cancelled) return;
        setPayload(res?.data ?? null);
      } catch {
        // Best-effort — drought is a nice-to-have, never block Today on it
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;
  if (!payload?.cuisine || !payload.daysSince) return null;

  const cuisine = titleCase(payload.cuisine.trim());
  const days = payload.daysSince;
  const bg = isDark ? PastelDark.sky : Pastel.sky;
  const accent = Accent.sky;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const a11y = `${cuisine} has been quiet for ${days} days. Tap to explore ${cuisine} recipes.`;

  return (
    <HapticTouchableOpacity
      testID="cuisine-drought-card"
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => onPress?.(cuisine)}
      hapticStyle="light"
      style={[styles.card, { backgroundColor: bg }]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>
          <Ionicons name="time-outline" size={18} color={accent} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: accent }]}>QUIET KITCHEN</Text>
          <Text style={[styles.title, { color: text }]} numberOfLines={2}>
            {cuisine} has been quiet.
          </Text>
          <Text style={[styles.body, { color: sub }]} numberOfLines={2}>
            {days} days since your last {cuisine.toLowerCase()} plate — something tonight?
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={accent} />
      </View>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 17,
  },
});
