// Group 10R Surface 4: Bottom-pinned Food Intel toast on shopping check-off.
// Tiers tip depth by purchase count — same item, deeper insight each time.

import { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import {
  matchFoodIntelTips,
  recordTipEngagement,
} from '../../lib/foodIntelMatcher';
import type {
  FoodIntelTip,
  FoodIntelCategory,
} from '../../lib/foodIntelTips';
import { useFoodIntelUserState } from '../../hooks/useFoodIntelUserState';

interface FoodIntelToastProps {
  itemName: string | null;
  purchaseCount?: number;
  onHide: () => void;
  testID?: string;
}

const AUTO_DISMISS_MS = 5000;

let shoppingSessionShown = false;

export function __resetShoppingSessionForTests(): void {
  shoppingSessionShown = false;
}

function preferredCategories(purchaseCount: number): FoodIntelCategory[] {
  if (purchaseCount >= 10) return ['pairing'];
  if (purchaseCount >= 5) return ['technique'];
  return ['superfood', 'nutrient'];
}

function pickTipForTier(
  tips: FoodIntelTip[],
  purchaseCount: number,
): FoodIntelTip | null {
  if (tips.length === 0) return null;
  const preferred = preferredCategories(purchaseCount);
  for (const cat of preferred) {
    const hit = tips.find((t) => t.category === cat);
    if (hit) return hit;
  }
  return tips[0];
}

export default function FoodIntelToast({
  itemName,
  purchaseCount = 1,
  onHide,
  testID,
}: FoodIntelToastProps) {
  const userState = useFoodIntelUserState();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [tip, setTip] = useState<FoodIntelTip | null>(null);
  const dismissedRef = useRef(false);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    if (!itemName) {
      setTip(null);
      return;
    }
    if (shoppingSessionShown) return;
    if (!userState) return;

    matchFoodIntelTips(
      { ingredients: [itemName], trigger: itemName, screenType: 'shopping' },
      userState,
      { limit: 5 },
    )
      .then((tips) => {
        if (cancelled) return;
        const chosen = pickTipForTier(tips, purchaseCount);
        if (!chosen) return;
        if (shoppingSessionShown) return;
        shoppingSessionShown = true;
        setTip(chosen);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [itemName, purchaseCount, userState]);

  useEffect(() => {
    if (!tip) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    opacity.value = withTiming(1, { duration: 220 });

    const timer = setTimeout(() => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      recordTipEngagement(userState.userId, tip.id, 'ignored').catch(() => {});
      onHide();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [tip, userState?.userId, onHide, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!itemName || !tip) return null;

  const handlePress = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    opacity.value = withTiming(0, { duration: 180 });
    recordTipEngagement(userState.userId, tip.id, 'expanded').catch(() => {});
    onHide();
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, animatedStyle]}
    >
      <HapticTouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`Food intel: ${tip.title}. Tap to dismiss.`}
        onPress={handlePress}
        pressedScale={0.97}
        style={[
          styles.toast,
          { backgroundColor: isDark ? PastelDark.sage : Pastel.sage },
          Shadows.MD,
        ]}
      >
        <Text
          style={[
            styles.title,
            { color: isDark ? '#A7F3D0' : '#1F3D22' },
          ]}
          numberOfLines={2}
        >
          {`💡 ${tip.title}`}
        </Text>
        <Text
          style={[
            styles.body,
            { color: isDark ? '#D1FAE5' : '#2E5931' },
          ]}
          numberOfLines={3}
        >
          {tip.body}
        </Text>
        <Text
          style={[
            styles.meta,
            { color: isDark ? '#86EFAC' : '#4B7050' },
          ]}
        >
          {tip.category}
        </Text>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  toast: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  body: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 18,
  },
  meta: {
    marginTop: 8,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
