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
import { useSubscription, type PurchaseInterval } from '../../hooks/useSubscription';
import { isLifetimeWindowOpen } from '../../constants/lifetimeOffer';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../ui/GradientButton';
import { LogoMascot } from '../mascot';
import Sazon from '../mascot/Sazon';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import { PremiumCelebration } from '../celebrations';
import { paywallBg, premiumCTA } from '../../constants/Gradients';
import { Pastel, PastelDark } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Shadows } from '../../constants/Shadows';

// Three highest-leverage value props (always visible). Persona-tuned: each one
// answers "what does Sazon do that no macro app does?" — not a feature laundry list.
const CORE_FEATURES = [
  { icon: '🍽', label: 'Unlimited Build-a-Plate', tint: Pastel.sage, tintDark: PastelDark.sage },
  { icon: '🧠', label: 'Personalization that learns you', tint: Pastel.lavender, tintDark: PastelDark.lavender },
  { icon: '🗓', label: 'Smart meal plans + shopping list', tint: Pastel.sky, tintDark: PastelDark.sky },
];

// Surfaced behind a "See all features" tap so the paywall stays scannable.
const EXTRA_FEATURES = [
  { icon: '📊', label: 'Advanced nutrition insights', tint: Pastel.peach, tintDark: PastelDark.peach },
  { icon: '🧩', label: 'Pantry & expiry tracking', tint: Pastel.golden, tintDark: PastelDark.golden },
  { icon: '🔔', label: 'Smart reminders & alerts', tint: Pastel.blush, tintDark: PastelDark.blush },
];

interface PaywallScreenProps {
  onClose?: () => void;
}

export function PaywallScreen({ onClose }: PaywallScreenProps) {
  const {
    subscription,
    offerings,
    checkoutLoading,
    restoreLoading,
    trialDaysLeft,
    purchase,
    restore,
    openPortal,
    showPremiumCelebration,
    dismissPremiumCelebration,
  } = useSubscription();
  const [interval, setInterval] = useState<PurchaseInterval>('year');
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // Native: prefer RC's locale-formatted price strings. Web/fallback uses
  // the Stripe-side defaults so pricing isn't blank during dev.
  const monthlyPriceLabel = offerings.monthly?.product.priceString ?? '$9 / mo';
  const annualPriceLabel = offerings.annual?.product.priceString ?? '$60 / yr';
  const lifetimePriceLabel = offerings.lifetime?.product.priceString ?? '$79.99';

  // Third tile is double-gated: launch-window open AND the RC offering actually
  // exists in the dashboard. Either gate falsy → 2-tile layout.
  const lifetimeAvailable = isLifetimeWindowOpen() && offerings.lifetime !== null;

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
              testID="paywall-close"
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
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
            <Sazon variant="orange" motion="celebrate" fx={['confetti', 'hearts']} size={96} />
          </MotiView>

          <MotiView
            from={{ translateY: 16, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260, delay: 200 }}
          >
            <Text style={styles.heroTitle} testID="paywall-headline">Past the spreadsheet.</Text>
            <Text style={styles.heroSubtitle}>Real food. Made for you. From everywhere.</Text>
            <Text testID="paywall-trust-line" style={styles.trustLine}>
              Cancel anytime. No spam.
            </Text>
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

        {/* Feature list — 3 core + collapsible "See all" extras (no laundry list). */}
        <View style={styles.featureList}>
          {CORE_FEATURES.map((f, i) => (
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

          {showAllFeatures &&
            EXTRA_FEATURES.map((f, i) => (
              <MotiView
                key={f.label}
                from={{ translateX: -24, opacity: 0 }}
                animate={{ translateX: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 18, stiffness: 260, delay: i * 50 }}
                style={styles.featureRow}
              >
                <View style={[styles.featureIconBadge, { backgroundColor: f.tint }]}>
                  <Text style={styles.featureEmoji}>{f.icon}</Text>
                </View>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureCheck}>✓</Text>
              </MotiView>
            ))}

          <HapticTouchableOpacity
            testID="paywall-see-all-features"
            onPress={() => setShowAllFeatures((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showAllFeatures ? 'Hide extra features' : 'See all features'}
            style={styles.seeAllFeaturesButton}
          >
            <Text style={styles.seeAllFeaturesLabel}>
              {showAllFeatures ? 'Show less' : 'See all features'}
            </Text>
          </HapticTouchableOpacity>
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
                    {monthlyPriceLabel}
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
                    {annualPriceLabel}
                  </Text>
                </HapticTouchableOpacity>
              </MotiView>

              {lifetimeAvailable && (
                <MotiView
                  animate={{ scale: interval === 'lifetime' ? 1.02 : 0.98 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 300 }}
                  style={{ flex: 1 }}
                >
                  <HapticTouchableOpacity
                    testID="paywall-lifetime-option"
                    style={[
                      styles.pricingOption,
                      interval === 'lifetime' && styles.pricingOptionActive,
                    ]}
                    onPress={() => setInterval('lifetime')}
                  >
                    <View style={styles.annualRow}>
                      <Text style={[
                        styles.pricingLabel,
                        { color: interval === 'lifetime' ? '#FFFFFF' : '#9CA3AF' },
                      ]}>
                        Lifetime
                      </Text>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>Launch</Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.pricingAmount,
                      { color: interval === 'lifetime' ? '#FFB74D' : '#6B7280' },
                    ]}>
                      {lifetimePriceLabel}
                    </Text>
                  </HapticTouchableOpacity>
                </MotiView>
              )}
            </View>

            {/* CTA — shimmer every 3s */}
            <View style={styles.ctaContainer}>
              <View>
                <GradientButton
                  label={interval === 'lifetime' ? 'Unlock Lifetime' : 'Start Free Trial'}
                  onPress={() => purchase(interval)}
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
                {interval === 'lifetime'
                  ? 'One payment. Yours forever — no renewals.'
                  : `No charge for 7 days. Cancel anytime in ${
                      Platform.OS === 'ios' ? 'App Store' : 'Google Play'
                    } settings.`}
              </Text>

              {/* Restore Purchases — required by App Store guideline 3.1.1 */}
              <HapticTouchableOpacity
                style={styles.restoreButton}
                onPress={restore}
                accessibilityLabel="Restore previous purchases"
                accessibilityRole="button"
                disabled={restoreLoading}
                testID="paywall-restore-purchases"
              >
                <Text style={styles.restoreLabel}>
                  {restoreLoading ? 'Restoring…' : 'Restore Purchases'}
                </Text>
              </HapticTouchableOpacity>
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
    fontFamily: 'PlusJakartaSans_800ExtraBold',
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
  trustLine: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.2,
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
    fontFamily: 'PlusJakartaSans_700Bold',
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
    fontFamily: 'PlusJakartaSans_600SemiBold',
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
    fontFamily: 'PlusJakartaSans_500Medium',
    color: 'rgba(255,255,255,0.85)',
  },
  featureCheck: {
    color: '#34D399',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: FontSize.md,
  },
  seeAllFeaturesButton: {
    alignSelf: 'center',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  seeAllFeaturesLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: FontSize.sm,
    textDecorationLine: 'underline',
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
    fontFamily: 'PlusJakartaSans_700Bold',
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
    fontFamily: 'PlusJakartaSans_800ExtraBold',
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
  restoreButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restoreLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textDecorationLine: 'underline',
  },
});
