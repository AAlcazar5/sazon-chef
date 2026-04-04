// frontend/components/premium/PaywallScreen.tsx
// 9N: Dark gradient paywall with pastel-tinted feature icon badges,
// shimmer CTA, spring entrance for price pill.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSubscription } from '../../hooks/useSubscription';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../ui/GradientButton';
import { LogoMascot } from '../mascot';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import { PremiumCelebration } from '../celebrations';
import { paywallBg, premiumCTA } from '../../constants/Gradients';
import { Pastel, PastelDark } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Shadows } from '../../constants/Shadows';

const PREMIUM_FEATURES = [
  { icon: '🗓', label: 'Unlimited AI meal plans', tint: Pastel.sage, tintDark: PastelDark.sage },
  { icon: '🛒', label: 'Smart shopping list generation', tint: Pastel.sky, tintDark: PastelDark.sky },
  { icon: '📊', label: 'Advanced nutrition insights', tint: Pastel.lavender, tintDark: PastelDark.lavender },
  { icon: '🍳', label: 'Cooking mode with timers', tint: Pastel.peach, tintDark: PastelDark.peach },
  { icon: '🧩', label: 'Pantry & expiry tracking', tint: Pastel.golden, tintDark: PastelDark.golden },
  { icon: '🔔', label: 'Smart reminders & alerts', tint: Pastel.blush, tintDark: PastelDark.blush },
];

interface PaywallScreenProps {
  onClose?: () => void;
}

export function PaywallScreen({ onClose }: PaywallScreenProps) {
  const { subscription, checkoutLoading, trialDaysLeft, startCheckout, openPortal, showPremiumCelebration, dismissPremiumCelebration } =
    useSubscription();
  const [interval, setInterval] = useState<'month' | 'year'>('month');

  // Shimmer animation for CTA
  const shimmerX = useSharedValue(-1);
  useEffect(() => {
    shimmerX.value = withDelay(
      3000,
      withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerX.value > -0.2 && shimmerX.value < 0.2 ? 0.4 : 0,
  }));

  const isManageable =
    subscription.isPremium && subscription.status !== 'canceled';

  if (subscription.loading) {
    return (
      <View style={styles.loadingContainer}>
        <AnimatedActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Dark gradient background — full screen */}
        <LinearGradient
          colors={[paywallBg[0], paywallBg[1], '#0D0D0D']}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Hero section */}
        <View style={styles.hero}>
          {onClose && (
            <HapticTouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close paywall"
            >
              <Text style={styles.closeX}>×</Text>
            </HapticTouchableOpacity>
          )}

          <MotiView
            from={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 280, delay: 80 }}
          >
            <LogoMascot expression="celebrating" size="medium" />
          </MotiView>

          <MotiView
            from={{ translateY: 16, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260, delay: 200 }}
          >
            <Text style={styles.heroTitle}>Sazon Premium</Text>
            <Text style={styles.heroSubtitle}>Your personal chef — unlocked</Text>
          </MotiView>
        </View>

        {/* Trial badge */}
        {!subscription.isPremium && (
          <MotiView
            from={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 16, stiffness: 280, delay: 300 }}
            style={styles.trialBadgeContainer}
          >
            <LinearGradient
              colors={['#fa7e12', '#f59e0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.trialBadge}
            >
              <Text style={styles.trialText}>✦ 7-day free trial — cancel anytime</Text>
            </LinearGradient>
          </MotiView>
        )}

        {isManageable && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>
              {subscription.status === 'trialing'
                ? `Trial active — ${trialDaysLeft ?? 0} day${trialDaysLeft !== 1 ? 's' : ''} left`
                : 'You have Sazon Premium'}
            </Text>
          </View>
        )}

        {/* Feature list — pastel-tinted icon badges */}
        <View style={styles.featureList}>
          {PREMIUM_FEATURES.map((f, i) => (
            <MotiView
              key={f.label}
              from={{ translateX: -24, opacity: 0 }}
              animate={{ translateX: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 18, stiffness: 260, delay: 350 + i * 60 }}
              style={styles.featureRow}
            >
              <View style={[styles.featureIconBadge, { backgroundColor: f.tint }]}>
                <Text style={styles.featureEmoji}>{f.icon}</Text>
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureCheck}>✓</Text>
            </MotiView>
          ))}
        </View>

        {/* Plan toggle + CTA */}
        {!isManageable && (
          <MotiView
            from={{ translateY: 20, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 240, delay: 750 }}
          >
            {/* Pricing toggle — gradient pill with spring */}
            <View style={styles.pricingToggle}>
              <MotiView
                animate={{ scale: interval === 'month' ? 1.02 : 0.98 }}
                transition={{ type: 'spring', damping: 14, stiffness: 300 }}
                style={{ flex: 1 }}
              >
                <HapticTouchableOpacity
                  style={[
                    styles.pricingOption,
                    interval === 'month' && styles.pricingOptionActive,
                  ]}
                  onPress={() => setInterval('month')}
                >
                  <Text style={[
                    styles.pricingLabel,
                    { color: interval === 'month' ? '#FFFFFF' : '#9CA3AF' },
                  ]}>
                    Monthly
                  </Text>
                  <Text style={[
                    styles.pricingAmount,
                    { color: interval === 'month' ? '#FFB74D' : '#6B7280' },
                  ]}>
                    $4.99 / mo
                  </Text>
                </HapticTouchableOpacity>
              </MotiView>

              <MotiView
                animate={{ scale: interval === 'year' ? 1.02 : 0.98 }}
                transition={{ type: 'spring', damping: 14, stiffness: 300 }}
                style={{ flex: 1 }}
              >
                <HapticTouchableOpacity
                  style={[
                    styles.pricingOption,
                    interval === 'year' && styles.pricingOptionActive,
                  ]}
                  onPress={() => setInterval('year')}
                >
                  <View style={styles.annualRow}>
                    <Text style={[
                      styles.pricingLabel,
                      { color: interval === 'year' ? '#FFFFFF' : '#9CA3AF' },
                    ]}>
                      Annual
                    </Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>-33%</Text>
                    </View>
                  </View>
                  <Text style={[
                    styles.pricingAmount,
                    { color: interval === 'year' ? '#FFB74D' : '#6B7280' },
                  ]}>
                    $39.99 / yr
                  </Text>
                </HapticTouchableOpacity>
              </MotiView>
            </View>

            {/* CTA — shimmer every 3s */}
            <View style={styles.ctaContainer}>
              <View>
                <GradientButton
                  label="Start Free Trial"
                  onPress={() => startCheckout(interval)}
                  loading={checkoutLoading}
                  disabled={checkoutLoading}
                  colors={premiumCTA as unknown as [string, string]}
                  icon="star-outline"
                />
                {/* Shimmer overlay */}
                <Animated.View
                  style={[styles.shimmerOverlay, shimmerStyle]}
                  pointerEvents="none"
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
              <Text style={styles.legalText}>
                No charge for 7 days. Cancel anytime in{' '}
                {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} settings.
              </Text>
            </View>
          </MotiView>
        )}

        {isManageable && (
          <View style={styles.ctaContainer}>
            <GradientButton
              label="Manage Subscription"
              onPress={openPortal}
              colors={GradientPresets.info}
              icon="settings-outline"
            />
          </View>
        )}
      </ScrollView>

      {/* Premium conversion celebration */}
      <PremiumCelebration
        visible={showPremiumCelebration}
        onDismiss={() => {
          dismissPremiumCelebration();
          onClose?.();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0D0D',
  },
  hero: {
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 22,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: FontWeight.extrabold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  trialBadgeContainer: {
    marginHorizontal: 24,
    marginTop: -16,
    marginBottom: 8,
  },
  trialBadge: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  trialText: {
    color: '#fff',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  activeBadge: {
    marginHorizontal: 24,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activeBadgeText: {
    color: '#34D399',
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
    fontSize: FontSize.sm,
  },
  featureList: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureEmoji: {
    fontSize: 18,
  },
  featureLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  featureCheck: {
    color: '#34D399',
    fontWeight: FontWeight.extrabold,
    fontSize: FontSize.md,
  },
  pricingToggle: {
    marginHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 4,
    flexDirection: 'row',
    marginBottom: 16,
  },
  pricingOption: {
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  pricingOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pricingLabel: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  pricingAmount: {
    fontSize: 11,
    marginTop: 2,
  },
  annualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discountBadge: {
    backgroundColor: '#fa7e12',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
  },
  ctaContainer: {
    marginHorizontal: 24,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 100,
    overflow: 'hidden',
  },
  legalText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 12,
  },
});
