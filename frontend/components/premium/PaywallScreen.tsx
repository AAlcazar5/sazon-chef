// frontend/components/premium/PaywallScreen.tsx
// Full-screen paywall with monthly/annual toggle, feature list, and Stripe checkout.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../../hooks/useSubscription';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../ui/GradientButton';
import { SazonMascot } from '../mascot';
import { PremiumCelebration } from '../celebrations';

const PREMIUM_FEATURES = [
  { icon: '🗓', label: 'Unlimited AI meal plans' },
  { icon: '🛒', label: 'Smart shopping list generation' },
  { icon: '📊', label: 'Advanced nutrition insights' },
  { icon: '🍳', label: 'Cooking mode with timers' },
  { icon: '🧩', label: 'Pantry & expiry tracking' },
  { icon: '🔔', label: 'Smart reminders & alerts' },
];

interface PaywallScreenProps {
  onClose?: () => void;
}

export function PaywallScreen({ onClose }: PaywallScreenProps) {
  const { subscription, checkoutLoading, trialDaysLeft, startCheckout, openPortal, showPremiumCelebration, dismissPremiumCelebration } =
    useSubscription();
  const [interval, setInterval] = useState<'month' | 'year'>('month');

  const isManageable =
    subscription.isPremium && subscription.status !== 'canceled';

  if (subscription.loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <>
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero — gradient header */}
      <LinearGradient
        colors={['#A855F7', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center' }}
      >
        {onClose && (
          <HapticTouchableOpacity
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center', justifyContent: 'center',
            }}
            onPress={onClose}
          >
            <Text style={{ color: '#fff', fontSize: 18, lineHeight: 22 }}>×</Text>
          </HapticTouchableOpacity>
        )}

        <MotiView
          from={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 280, delay: 80 }}
        >
          <SazonMascot expression="celebrating" size="medium" />
        </MotiView>

        <MotiView
          from={{ translateY: 16, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 260, delay: 200 }}
        >
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center', marginTop: 16, marginBottom: 4 }}>
            Sazon Premium
          </Text>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
            Your personal chef — unlocked
          </Text>
        </MotiView>
      </LinearGradient>

      {/* Trial / active badge */}
      {!subscription.isPremium && (
        <MotiView
          from={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 16, stiffness: 280, delay: 300 }}
          style={{ marginHorizontal: 24, marginTop: -16, marginBottom: 8 }}
        >
          <LinearGradient
            colors={['#fa7e12', '#f59e0b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
              ✦ 7-day free trial — cancel anytime
            </Text>
          </LinearGradient>
        </MotiView>
      )}

      {isManageable && (
        <View className="mx-6 mt-4 mb-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-2xl px-4 py-3">
          <Text className="text-green-700 dark:text-green-400 font-semibold text-center text-sm">
            {subscription.status === 'trialing'
              ? `Trial active — ${trialDaysLeft ?? 0} day${trialDaysLeft !== 1 ? 's' : ''} left`
              : 'You have Sazon Premium'}
          </Text>
        </View>
      )}

      {/* Staggered feature list */}
      <View style={{ marginHorizontal: 24, marginTop: 20, marginBottom: 8 }}>
        {PREMIUM_FEATURES.map((f, i) => (
          <MotiView
            key={f.label}
            from={{ translateX: -24, opacity: 0 }}
            animate={{ translateX: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260, delay: 350 + i * 60 }}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: 'rgba(168,85,247,0.12)',
              alignItems: 'center', justifyContent: 'center',
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 20 }}>{f.icon}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: '#374151' }} className="dark:text-gray-200">
              {f.label}
            </Text>
            <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 16 }}>✓</Text>
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
          {/* Pricing toggle */}
          <View style={{
            marginHorizontal: 24, borderRadius: 20,
            backgroundColor: '#F3F4F6', padding: 4, flexDirection: 'row', marginBottom: 16,
          }} className="dark:bg-gray-800">
            <HapticTouchableOpacity
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center',
                backgroundColor: interval === 'month' ? '#fff' : 'transparent',
                shadowColor: interval === 'month' ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: interval === 'month' ? 2 : 0,
              }}
              onPress={() => setInterval('month')}
            >
              <Text style={{ fontWeight: '700', fontSize: 13, color: interval === 'month' ? '#111827' : '#6B7280' }} className="dark:text-white">
                Monthly
              </Text>
              <Text style={{ fontSize: 11, marginTop: 2, color: interval === 'month' ? '#fa7e12' : '#9CA3AF' }}>$4.99 / mo</Text>
            </HapticTouchableOpacity>

            <HapticTouchableOpacity
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center',
                backgroundColor: interval === 'year' ? '#fff' : 'transparent',
                shadowColor: interval === 'year' ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: interval === 'year' ? 2 : 0,
              }}
              onPress={() => setInterval('year')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: interval === 'year' ? '#111827' : '#6B7280' }} className="dark:text-white">
                  Annual
                </Text>
                <View style={{ backgroundColor: '#fa7e12', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>-33%</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, marginTop: 2, color: interval === 'year' ? '#fa7e12' : '#9CA3AF' }}>$39.99 / yr</Text>
            </HapticTouchableOpacity>
          </View>

          {/* CTA */}
          <View style={{ marginHorizontal: 24 }}>
            <GradientButton
              label="Start Free Trial"
              onPress={() => startCheckout(interval)}
              loading={checkoutLoading}
              disabled={checkoutLoading}
              colors={GradientPresets.premium}
              icon="star-outline"
            />
            <Text className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
              No charge for 7 days. Cancel anytime in{' '}
              {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} settings.
            </Text>
          </View>
        </MotiView>
      )}

      {isManageable && (
        <View style={{ marginHorizontal: 24, marginTop: 8 }}>
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
