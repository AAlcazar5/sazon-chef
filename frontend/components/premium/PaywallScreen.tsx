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
import { useSubscription } from '../../hooks/useSubscription';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { SazonMascot } from '../mascot';

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
  const { subscription, checkoutLoading, trialDaysLeft, startCheckout, openPortal } =
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
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="items-center pt-12 pb-6 px-6">
        {onClose && (
          <HapticTouchableOpacity
            className="absolute top-4 right-4 w-8 h-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
            onPress={onClose}
          >
            <Text className="text-gray-500 dark:text-gray-400 text-lg">×</Text>
          </HapticTouchableOpacity>
        )}

        <SazonMascot expression="celebrating" size="medium" />

        <Text className="text-3xl font-bold text-gray-900 dark:text-white text-center mt-4 mb-1">
          Sazon Premium
        </Text>
        <Text className="text-base text-gray-500 dark:text-gray-400 text-center">
          Your personal chef — unlocked
        </Text>
      </View>

      {/* Trial badge */}
      {!subscription.isPremium && (
        <View className="mx-6 mb-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-2xl px-4 py-3">
          <Text className="text-orange-600 dark:text-orange-400 font-semibold text-center text-sm">
            7-day free trial — cancel anytime
          </Text>
        </View>
      )}

      {/* Active subscription banner */}
      {isManageable && (
        <View className="mx-6 mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-2xl px-4 py-3">
          <Text className="text-green-700 dark:text-green-400 font-semibold text-center text-sm">
            {subscription.status === 'trialing'
              ? `Trial active — ${trialDaysLeft ?? 0} day${trialDaysLeft !== 1 ? 's' : ''} left`
              : 'You have Sazon Premium'}
          </Text>
        </View>
      )}

      {/* Features */}
      <View className="mx-6 mb-6">
        {PREMIUM_FEATURES.map((f) => (
          <View key={f.label} className="flex-row items-center mb-3">
            <Text className="text-2xl mr-3">{f.icon}</Text>
            <Text className="text-base text-gray-700 dark:text-gray-300 flex-1">{f.label}</Text>
            <Text className="text-green-500 font-bold text-lg">✓</Text>
          </View>
        ))}
      </View>

      {/* Plan toggle (only shown to non-premium users) */}
      {!isManageable && (
        <>
          <View className="mx-6 flex-row bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-4">
            <HapticTouchableOpacity
              className={`flex-1 py-3 rounded-xl items-center ${interval === 'month' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
              onPress={() => setInterval('month')}
            >
              <Text className={`font-semibold text-sm ${interval === 'month' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                Monthly
              </Text>
              <Text className={`text-xs mt-0.5 ${interval === 'month' ? 'text-orange-500' : 'text-gray-400'}`}>
                $4.99 / mo
              </Text>
            </HapticTouchableOpacity>

            <HapticTouchableOpacity
              className={`flex-1 py-3 rounded-xl items-center ${interval === 'year' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
              onPress={() => setInterval('year')}
            >
              <View className="flex-row items-center gap-1">
                <Text className={`font-semibold text-sm ${interval === 'year' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  Annual
                </Text>
                <View className="bg-orange-500 rounded px-1">
                  <Text className="text-white text-xs font-bold">-33%</Text>
                </View>
              </View>
              <Text className={`text-xs mt-0.5 ${interval === 'year' ? 'text-orange-500' : 'text-gray-400'}`}>
                $39.99 / yr
              </Text>
            </HapticTouchableOpacity>
          </View>

          {/* CTA button */}
          <View className="mx-6">
            <HapticTouchableOpacity
              className="bg-orange-500 py-4 rounded-2xl items-center"
              onPress={() => startCheckout(interval)}
              disabled={checkoutLoading}
              hapticStyle="medium"
            >
              {checkoutLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  Start Free Trial
                </Text>
              )}
            </HapticTouchableOpacity>

            <Text className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
              No charge for 7 days. Cancel anytime in{' '}
              {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} settings.
            </Text>
          </View>
        </>
      )}

      {/* Manage subscription (existing subscribers) */}
      {isManageable && (
        <View className="mx-6">
          <HapticTouchableOpacity
            className="border border-gray-300 dark:border-gray-600 py-4 rounded-2xl items-center"
            onPress={openPortal}
          >
            <Text className="text-gray-700 dark:text-gray-300 font-semibold text-base">
              Manage Subscription
            </Text>
          </HapticTouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
