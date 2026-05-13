// P4 retention — "you usually cook Tuesday nights" behavioral-pattern card.
//
// Only renders on the day that matches the user's dominant cook weekday.
// The card itself isn't a stat surface — it's the joy-bar "they get me"
// peak moment that fires ~once per week for users with established cook
// routines. Backend service auto-hides for new/light users.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { todayApi, type CookPatternPayload } from '../../lib/api/today';

interface CookPatternCardProps {
  onPress?: () => void;
}

export default function CookPatternCard({ onPress }: CookPatternCardProps): React.ReactElement | null {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [payload, setPayload] = useState<CookPatternPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await todayApi.cookPattern();
        if (cancelled) return;
        setPayload(res?.data ?? null);
      } catch {
        /* best-effort — pattern is a nice-to-have */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;
  if (!payload?.matchesToday || !payload.dayName) return null;

  const bg = isDark ? PastelDark.golden : Pastel.golden;
  const accent = Accent.golden;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const a11y = `You usually cook on ${payload.dayName} nights. Tap to find tonight's plate.`;

  return (
    <HapticTouchableOpacity
      testID="cook-pattern-card"
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => onPress?.()}
      hapticStyle="light"
      style={[styles.card, { backgroundColor: bg }]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>
          <Ionicons name="calendar-outline" size={18} color={accent} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: accent }]}>YOUR RHYTHM</Text>
          <Text style={[styles.title, { color: text }]} numberOfLines={2}>
            You usually cook on {payload.dayName} nights.
          </Text>
          <Text style={[styles.body, { color: sub }]} numberOfLines={2}>
            Tonight's the night — want me to set you up?
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
