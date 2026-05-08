// 10Y entry-points (1/3): Home screen "Ask Sazon" CTA card.
// Reads useCoachContext, picks a single contextual subtitle by signal priority,
// routes to the Coach tab on tap.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { useCoachContext } from '../../hooks/useCoachContext';
import { Pastel, PastelDark, Colors, DarkColors } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';

interface CoachContextLike {
  pantryExpiringSoon: string[];
  remainingMacros: { calories: number; protein: number; carbs: number; fat: number } | null;
  leftoverInventory: Array<{ name?: string; componentId?: string }>;
  topAdjacentCuisine: string | null;
}

const FALLBACK = "Tell me what you're hungry for";
const DESSERT_CALORIE_THRESHOLD = 500;

// Pure resolver — priority-ordered N=1 signal copy. Tested independently.
export function resolveAskSazonSubtitle(
  ctx: CoachContextLike | null,
  isLoading: boolean,
): string {
  if (isLoading || !ctx) return FALLBACK;

  if (ctx.pantryExpiringSoon.length > 0) {
    const item = ctx.pantryExpiringSoon[0];
    return `You've got ${item} expiring soon — ask the Coach`;
  }

  if (
    ctx.remainingMacros &&
    ctx.remainingMacros.calories > 0 &&
    ctx.remainingMacros.calories <= DESSERT_CALORIE_THRESHOLD
  ) {
    return `${Math.round(ctx.remainingMacros.calories)} cal left for dessert — Coach has ideas`;
  }

  if (ctx.leftoverInventory.length > 0) {
    // The Coach context API exposes leftover items by `componentId`; we accept
    // either field so callers can pass a richer name when available.
    const first = ctx.leftoverInventory[0];
    const label = first.name ?? first.componentId;
    if (label) return `Bridge yesterday's ${label} into tonight`;
  }

  if (ctx.topAdjacentCuisine) {
    return `Try a ${ctx.topAdjacentCuisine} plate — Coach has picks`;
  }

  return FALLBACK;
}

export default function AskSazonHomeCard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { context, isLoading } = useCoachContext();

  const subtitle = resolveAskSazonSubtitle(context, isLoading);
  const bg = isDark ? PastelDark.sage : Pastel.sage;
  const titleColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtitleColor = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const ctaBg = isDark ? DarkColors.primary : Colors.primary;

  const handlePress = () => {
    router.push('/(tabs)/coach' as never);
  };

  return (
    <View style={styles.outer}>
      <HapticTouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={subtitle}
        onPress={handlePress}
        style={[styles.card, Shadows.SM as any, { backgroundColor: bg }]}
      >
        <View style={styles.textCol}>
          <Text style={[styles.headline, { color: titleColor }]}>Ask Sazon</Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <View style={[styles.cta, { backgroundColor: ctaBg }]}>
          <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
        </View>
      </HapticTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.card,
    padding: 16,
    gap: 12,
    minHeight: 76,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  headline: {
    fontFamily: Platform.select({
      ios: 'Fraunces_600SemiBold',
      default: 'Fraunces_600SemiBold',
    }),
    fontSize: 18,
  },
  subtitle: {
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_500Medium',
      default: 'PlusJakartaSans_500Medium',
    }),
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    width: 44,
    height: 44,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
