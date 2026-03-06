// frontend/components/premium/CoffeeBanner.tsx
// Gentle "Buy Me a Coffee" banner shown to free-tier users after key moments.
// Frequency-capped to once per 7 days via AsyncStorage.
// Never shown to Premium or trialing subscribers.

import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { SazonMascot } from '../mascot/SazonMascot';
import { useSubscription } from '../../hooks/useSubscription';

const STORAGE_KEY = 'lastCoffeeBannerShown';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COFFEE_URL = 'https://ko-fi.com/sazonchef'; // Replace with actual Ko-fi / BMAC URL

interface CoffeeBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

export function CoffeeBanner({ visible, onDismiss }: CoffeeBannerProps) {
  const { subscription } = useSubscription();

  // Never render for premium / trialing users
  if (subscription.isPremium) return null;

  const handleSupport = async () => {
    await Linking.openURL(COFFEE_URL);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl px-6 pt-6 pb-10 items-center">
          <SazonMascot expression="chef-kiss" size="small" />

          <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mt-4 mb-2">
            Enjoying Sazon?
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            If Sazon is helping you eat better, a small coffee goes a long way toward keeping the stove on.
          </Text>

          <HapticTouchableOpacity
            className="w-full bg-yellow-400 py-4 rounded-2xl items-center mb-3"
            onPress={handleSupport}
            hapticStyle="medium"
          >
            <Text className="text-yellow-900 font-bold text-base">
              Support Sazon ☕
            </Text>
          </HapticTouchableOpacity>

          <HapticTouchableOpacity
            className="py-3"
            onPress={onDismiss}
            hapticDisabled
          >
            <Text className="text-gray-400 dark:text-gray-500 text-sm">Maybe later</Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Check whether the coffee banner should be shown, respecting the 7-day cooldown.
 * Call this before showing the banner at trigger points.
 */
export async function shouldShowCoffeeBanner(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const last = parseInt(raw, 10);
    return Date.now() - last >= COOLDOWN_MS;
  } catch {
    return false;
  }
}

/**
 * Record that the banner was shown. Call this when the banner becomes visible.
 */
export async function recordCoffeeBannerShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // silently ignore
  }
}
