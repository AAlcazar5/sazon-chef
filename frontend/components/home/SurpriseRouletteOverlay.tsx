// frontend/components/home/SurpriseRouletteOverlay.tsx
// ROADMAP 4.0 Tier J8 — Surprise-Me roulette reveal.
//
// Anticipation > immediate reveal. A ~2s roulette spin flickers through 5
// recipe-card backs (haptic ticks per flip), then settles on the chosen recipe
// with a spring scale + chef-kiss vibe. Emits a surprise_me_roulette
// SurfaceEvent on settle so the affective signal feeds B3 yield metrics.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { useSurfaceTracking } from '../../hooks/useSurfaceTracking';

const FLIP_INTERVAL_MS = 200;
const SPIN_DURATION_MS = 2000;
const FLIP_COUNT = Math.floor(SPIN_DURATION_MS / FLIP_INTERVAL_MS);

interface ChosenRecipe {
  id: string;
  title: string;
  imageUrl?: string | null;
}

interface SurpriseRouletteOverlayProps {
  visible: boolean;
  chosenRecipe: ChosenRecipe;
  onSettle: () => void;
}

export default function SurpriseRouletteOverlay({
  visible,
  chosenRecipe,
  onSettle,
}: SurpriseRouletteOverlayProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [settled, setSettled] = useState(false);
  const [tick, setTick] = useState(0);
  const cardScale = useSharedValue(1);
  const tracker = useSurfaceTracking();
  const settledRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      setSettled(false);
      settledRef.current = false;
      setTick(0);
      cardScale.value = 1;
      return;
    }

    settledRef.current = false;

    // Schedule each flicker tick with a haptic selection
    const flipTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < FLIP_COUNT; i += 1) {
      flipTimers.push(
        setTimeout(() => {
          Promise.resolve(Haptics.selectionAsync()).catch(() => undefined);
          setTick((t) => t + 1);
        }, FLIP_INTERVAL_MS * (i + 1)),
      );
    }

    // Settle timer
    const settleTimer = setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      setSettled(true);
      cardScale.value = withSequence(
        withTiming(0.94, { duration: 80 }),
        withSpring(1.04, { damping: 10, stiffness: 220 }),
        withSpring(1, { damping: 12, stiffness: 200 }),
      );
      tracker.track({
        surface: 'surprise_me_roulette',
        action: 'tap',
        recipeId: chosenRecipe.id,
      });
      onSettle();
    }, SPIN_DURATION_MS);

    return () => {
      flipTimers.forEach((t) => clearTimeout(t));
      clearTimeout(settleTimer);
    };
  }, [visible, chosenRecipe.id, onSettle, cardScale, tracker]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  if (!visible) return null;

  const cardBg = isDark ? PastelDark.peach : Pastel.peach;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? DarkColors.text.tertiary : Colors.text.tertiary;
  const showImage = settled && chosenRecipe.imageUrl;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        testID="roulette-card"
        style={[styles.card, { backgroundColor: cardBg }, animatedCardStyle]}
      >
        {showImage ? (
          <Image
            source={{ uri: chosenRecipe.imageUrl ?? undefined }}
            style={styles.image}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.spinFace}>
            <Text style={[styles.spinDots, { color: sub }]}>
              {'•'.repeat((tick % 3) + 1)}
            </Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text style={[styles.title, { color: text }]} numberOfLines={2}>
            {settled ? chosenRecipe.title : 'Picking…'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 280,
    borderRadius: 24,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  spinFace: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinDots: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 48,
    letterSpacing: 6,
  },
  copy: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 20,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
});
