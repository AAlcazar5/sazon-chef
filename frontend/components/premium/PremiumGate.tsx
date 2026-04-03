// frontend/components/premium/PremiumGate.tsx
// Wrapper that shows a paywall prompt when the feature requires premium.
// Usage: wrap any premium-only UI with <PremiumGate> and it will either
// render children (if premium) or show an upgrade CTA.

import React from 'react';
import { View, Text } from 'react-native';
import { useSubscription } from '../../hooks/useSubscription';
import GradientButton, { GradientPresets } from '../ui/GradientButton';
import { LogoMascot } from '../mascot';

interface PremiumGateProps {
  children: React.ReactNode;
  /** Feature description shown in the paywall prompt */
  featureName?: string;
  /** Called when the user taps "Upgrade" — navigate to PaywallScreen */
  onUpgrade: () => void;
}

export function PremiumGate({ children, featureName, onUpgrade }: PremiumGateProps) {
  const { subscription } = useSubscription();

  if (subscription.loading) return null;
  if (subscription.isPremium) return <>{children}</>;

  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <LogoMascot expression="supportive" size="medium" />

      <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mt-6 mb-2">
        Premium Feature
      </Text>

      {featureName && (
        <Text className="text-base text-gray-500 dark:text-gray-400 text-center mb-2">
          {featureName} is available on Sazon Premium.
        </Text>
      )}

      <Text className="text-sm text-gray-400 dark:text-gray-500 text-center mb-8">
        Unlock all features with a 7-day free trial.
      </Text>

      <GradientButton
        label="Start Free Trial"
        onPress={onUpgrade}
        colors={GradientPresets.premium}
        icon="star"
      />
    </View>
  );
}
