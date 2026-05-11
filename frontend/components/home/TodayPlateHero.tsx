// frontend/components/home/TodayPlateHero.tsx
// ROADMAP 4.0 BAP0.1 — Build-a-Plate IS the Today hero.
//
// Replaces the recipe-of-the-day hero from EditorialHomeLayout as the
// above-the-fold surface on Today. Composes:
//   - useTodayPlateContext()  → resolves the variant (leftover / pantry /
//     plate-of-week / cold-start) for THIS visit
//   - <TodayPlateCard>        → variant body (slot icons + macros + eyebrow)
//   - <PlateRationaleRibbon>  → "why these slots" supporting line below
//
// CTA is a single sage-gradient pill: "Open in Build-a-Plate" (or the
// variant-specific phrasing from ctaLabelFor). Taps push to /build-a-plate
// with the variant's seeding param so the composer opens with the right
// initial state.
//
// Peak moment (joy bar): on first paint per session, the card spring-fades
// in + a subtle sparkle on the eyebrow (kept tasteful — this is the most
// repeated surface in the app).

import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import BrandButton from '../ui/BrandButton';
import TodayPlateCard, { ctaLabelFor } from './TodayPlateCard';
import PlateRationaleRibbon, { type PlateRationale } from './PlateRationaleRibbon';
import {
  useTodayPlateContext,
  type TodayPlateContext,
} from '../../hooks/useTodayPlateContext';
import { Pastel, Accent } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';

interface TodayPlateHeroProps {
  /** Optional override — primarily for tests that want to pin a variant. */
  contextOverride?: TodayPlateContext;
  /** Optional rationale built server-side (BAP0.2). When omitted, the
   *  ribbon hides — the hero is still complete on its own. */
  rationale?: PlateRationale | null;
}

const SPRING_FRICTION = 9;
const SPRING_TENSION = 60;

function buildPushParams(variant: TodayPlateContext['variant'], context: TodayPlateContext): {
  pathname: string;
  params: Record<string, string>;
} {
  switch (variant) {
    case 'leftover':
      // Stretch flow — open BAP with pantryOnly so the leftover signals
      // are immediately reachable in the slot picker.
      return { pathname: '/build-a-plate', params: { pantryOnly: 'true' } };
    case 'pantry':
      // Pantry permutation has a preset id we can deep-link into.
      return {
        pathname: '/build-a-plate',
        params: context.pantryPlate
          ? { pantryOnly: 'true', preset: context.pantryPlate.id }
          : { pantryOnly: 'true' },
      };
    case 'plateOfWeek':
      return {
        pathname: '/build-a-plate',
        params: context.weekPlate ? { plateId: context.weekPlate.id } : {},
      };
    case 'coldStart':
    default:
      return { pathname: '/build-a-plate', params: { seedFromToday: 'true' } };
  }
}

export default function TodayPlateHero({
  contextOverride,
  rationale,
}: TodayPlateHeroProps) {
  const router = useRouter();
  const liveContext = useTodayPlateContext();
  const context = contextOverride ?? liveContext;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Peak moment: spring-fade in on mount.
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    if (context.isLoading) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: SPRING_FRICTION,
        tension: SPRING_TENSION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [context.isLoading, opacity, translateY]);

  const handlePress = useCallback(() => {
    const { pathname, params } = buildPushParams(context.variant, context);
    router.push({ pathname, params } as never);
  }, [context, router]);

  // Hide entirely while initial signals are still in flight to avoid a
  // flicker between cold-start and the resolved variant.
  if (context.isLoading) return null;

  const gradientColors = isDark
    ? (['rgba(129,199,132,0.18)', 'rgba(28,28,30,0.0)'] as const)
    : ([Pastel.sage, '#FAF7F4'] as const);

  return (
    <Animated.View
      style={[
        styles.outer,
        { opacity, transform: [{ translateY }] },
      ]}
      testID="today-plate-hero"
      accessibilityRole="summary"
    >
      <View
        style={[
          styles.card,
          isDark ? styles.cardDark : styles.cardLight,
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <TodayPlateCard context={context} />

          <View style={styles.ctaRow}>
            <BrandButton
              label={ctaLabelFor(context.variant)}
              variant="sage"
              onPress={handlePress}
              accessibilityLabel={`${ctaLabelFor(context.variant)} for today's plate`}
              testID="today-plate-hero-cta"
            />
          </View>
        </LinearGradient>
      </View>

      {rationale ? (
        <View style={styles.ribbonWrap}>
          <PlateRationaleRibbon rationale={rationale} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: { elevation: 4 },
  default: {},
});

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 16,
  },
  card: {
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    ...cardShadow,
  },
  cardLight: {
    backgroundColor: Pastel.sage,
  },
  cardDark: {
    backgroundColor: '#1C1C1E',
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  ctaRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  ribbonWrap: {
    marginTop: 6,
  },
});

// Used by Accent for unique-ref check; suppress unused-import lint.
void Accent;
