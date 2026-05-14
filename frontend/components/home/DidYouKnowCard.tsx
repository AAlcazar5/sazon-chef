// frontend/components/home/DidYouKnowCard.tsx
// Group 10R Surface 3 — rotating "Did You Know?" home feed card.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useFoodIntelUserState } from '../../hooks/useFoodIntelUserState';
import {
  matchFoodIntelTips,
  recordTipEngagement,
} from '../../lib/foodIntelMatcher';
import { getTipSearchQuery } from '../../lib/foodIntelAction';
import type { FoodIntelTip } from '../../lib/foodIntelTips';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Pastel, PastelDark, EditorialColors } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { Duration } from '../../constants/Animations';

interface DidYouKnowCardProps {
  testID?: string;
  onDismiss?: () => void;
}

export default function DidYouKnowCard({ testID, onDismiss }: DidYouKnowCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const userState = useFoodIntelUserState();

  const [tip, setTip] = useState<FoodIntelTip | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userState) return;
    // Group 10R-Phase2: pass last 7 days of cooked ingredients so the matcher's
    // primary scoring path (novelty + ingredient + nutrient signals) fires
    // instead of falling through to cuisine-affinity-only.
    const ingredients = userState.last7DaysIngredients ?? [];
    matchFoodIntelTips({ ingredients, screenType: 'home' }, userState)
      .then((tips) => {
        if (cancelled) return;
        setTip(tips[0] ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setTip(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userState]);

  const handleDismiss = useCallback(() => {
    if (!tip || !userState) return;
    setDismissed(true);
    void recordTipEngagement(userState.userId, tip.id, 'dismissed');
    onDismiss?.();
  }, [tip, userState, onDismiss]);

  const handleExpand = useCallback(() => {
    if (!tip || !userState) return;
    void recordTipEngagement(userState.userId, tip.id, 'expanded');
    // Searchable tips (superfood / nutrient / pairing / ingredient) route to
    // the home tab's recipe search seeded with the tip's primary ingredient.
    // Non-searchable categories stay engagement-only — future detail expansion.
    const query = getTipSearchQuery(tip);
    if (query) {
      router.push(`/?search=${encodeURIComponent(query)}` as never);
    }
  }, [tip, userState]);

  if (!tip || dismissed) return null;

  const bg = isDark ? PastelDark.lavender : Pastel.lavender;
  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const bodyColor = isDark ? '#D1D5DB' : '#4B5563';
  const eyebrowColor = isDark ? '#CE93D8' : EditorialColors.pastelTitle.lavender;

  return (
    <Animated.View
      entering={FadeIn.duration(Duration.medium)}
      style={[styles.card, { backgroundColor: bg }]}
      testID={testID}
      accessibilityLabel={`Did you know? ${tip.title}`}
    >
      <HapticTouchableOpacity
        onPress={handleExpand}
        accessibilityLabel={`Expand tip: ${tip.title}`}
        testID={testID ? `${testID}-body` : 'dyk-card-body'}
        style={styles.body}
      >
        <View style={styles.headerRow}>
          <Text style={styles.icon}>💡</Text>
          <Text style={[EditorialTypography.eyebrow, { color: eyebrowColor }]}>
            Did You Know?
          </Text>
        </View>
        <Text style={[styles.title, { color: titleColor }]}>{tip.title}</Text>
        <Text style={[styles.tipBody, { color: bodyColor }]} numberOfLines={3}>
          {tip.body}
        </Text>
      </HapticTouchableOpacity>

      <HapticTouchableOpacity
        onPress={handleDismiss}
        accessibilityLabel="Dismiss tip"
        testID={testID ? `${testID}-dismiss` : 'dyk-card-dismiss'}
        hapticStyle="light"
        style={styles.dismiss}
      >
        <Text style={[styles.dismissIcon, { color: bodyColor }]}>×</Text>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.card,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...cardShadow,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  icon: {
    fontSize: 14,
  },
  title: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 17,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  tipBody: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  dismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  dismissIcon: {
    fontSize: 22,
    lineHeight: 22,
    fontFamily: EditorialFontFamily.body.regular,
  },
});
