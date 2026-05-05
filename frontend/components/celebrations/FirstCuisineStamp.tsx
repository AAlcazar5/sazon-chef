// frontend/components/celebrations/FirstCuisineStamp.tsx
// ROADMAP 4.0 Tier J2 — First-cook-of-cuisine passport stamp.
//
// Tappable stamp that appears inside the cooking-complete celebration when the
// user just cooked a cuisine for the first time. Lifestyle voice: "the world
// map just expanded." Tap routes to Kitchen → Journey cuisine map.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import ProgressRing from '../ui/ProgressRing';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

interface FirstCuisineStampProps {
  isFirstCook: boolean;
  cuisine: string;
  cuisinesCookedCount: number;
  totalCuisinesAvailable: number;
  onPress: () => void;
}

const titleCase = (s: string): string => {
  if (!s) return '';
  return s
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
};

export default function FirstCuisineStamp({
  isFirstCook,
  cuisine,
  cuisinesCookedCount,
  totalCuisinesAvailable,
  onPress,
}: FirstCuisineStampProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isFirstCook) return null;
  const cuisineDisplay = titleCase(cuisine.trim());
  if (!cuisineDisplay) return null;

  const bg = isDark ? PastelDark.golden : Pastel.golden;
  const accent = Accent.golden;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subText = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const safeTotal = Math.max(totalCuisinesAvailable, 1);
  const progress = Math.min(cuisinesCookedCount / safeTotal, 1);

  return (
    <HapticTouchableOpacity
      testID="first-cuisine-stamp"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Your first ${cuisineDisplay} plate. ${cuisinesCookedCount} of ${totalCuisinesAvailable} cuisines cooked.`}
      pressedScale={0.98}
      style={[styles.card, { backgroundColor: bg }]}
    >
      <View style={styles.row}>
        <ProgressRing
          progress={progress}
          size={56}
          strokeWidth={5}
          color={accent}
          testID="first-cuisine-stamp-ring"
        >
          <Ionicons name="earth" size={22} color={accent} />
        </ProgressRing>
        <View style={styles.copy}>
          <View style={styles.headerRow}>
            <Ionicons name="sparkles" size={13} color={accent} />
            <Text style={[styles.eyebrow, { color: accent }]}>FIRST PLATE</Text>
          </View>
          <Text style={[styles.title, { color: text }]} numberOfLines={2}>
            Your first {cuisineDisplay} plate.
          </Text>
          <Text style={[styles.body, { color: subText }]} numberOfLines={2}>
            The world map just expanded — {cuisinesCookedCount} / {totalCuisinesAvailable} cuisines cooked.
          </Text>
        </View>
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
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 18,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  body: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});
