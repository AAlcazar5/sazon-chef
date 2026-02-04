// frontend/hooks/useWelcomeEffects.ts
// Manages welcome-back toast (24 h away check), analytics screen-view on focus,
// and the first-time guidance tooltip lifecycle.

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from '../utils/analytics';
import { HapticPatterns } from '../constants/Haptics';
import type { ToastType } from '../components/ui/Toast';

interface UseWelcomeEffectsOptions {
  userId: string | undefined;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  suggestedRecipesCount: number;
  loading: boolean;
}

interface UseWelcomeEffectsReturn {
  showFirstTimeTooltip: boolean;
  dismissFirstTimeTooltip: () => Promise<void>;
}

const LAST_VISIT_KEY = '@sazon_last_visit';
const HAS_SEEN_HOME_GUIDANCE_KEY = '@sazon_has_seen_home_guidance';

export function useWelcomeEffects(options: UseWelcomeEffectsOptions): UseWelcomeEffectsReturn {
  const { userId, showToast, suggestedRecipesCount, loading } = options;

  const [showFirstTimeTooltip, setShowFirstTimeTooltip] = useState(false);

  // Welcome back notification + analytics screen-view on focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        analytics.initialize(userId).then(() => {
          analytics.trackScreenView('home', {});
        });
      }

      const checkWelcomeBack = async () => {
        try {
          const lastVisitStr = await AsyncStorage.getItem(LAST_VISIT_KEY);
          const now = Date.now();

          if (lastVisitStr) {
            const lastVisit = parseInt(lastVisitStr, 10);
            const hoursSinceLastVisit = (now - lastVisit) / (1000 * 60 * 60);

            if (hoursSinceLastVisit >= 24) {
              const daysSinceLastVisit = Math.floor(hoursSinceLastVisit / 24);
              let message = "Welcome back! Ready to cook something amazing?";

              if (daysSinceLastVisit === 1) {
                message = "Welcome back! It's been a day - let's find you some great recipes!";
              } else if (daysSinceLastVisit > 1) {
                message = `Welcome back! It's been ${daysSinceLastVisit} days - we've missed you!`;
              }

              showToast(message, 'info', 4000);
              HapticPatterns.success();
            }
          }

          await AsyncStorage.setItem(LAST_VISIT_KEY, now.toString());
        } catch (error) {
          console.error('Error checking welcome back:', error);
        }
      };

      checkWelcomeBack();
    }, [userId, showToast])
  );

  // First-time user guidance tooltip
  useFocusEffect(
    useCallback(() => {
      const checkFirstTime = async () => {
        try {
          const hasSeen = await AsyncStorage.getItem(HAS_SEEN_HOME_GUIDANCE_KEY);

          if (!hasSeen && suggestedRecipesCount > 0 && !loading) {
            setTimeout(() => {
              setShowFirstTimeTooltip(true);
            }, 1000);
          }
        } catch (error) {
          console.error('Error checking first-time guidance:', error);
        }
      };

      checkFirstTime();
    }, [suggestedRecipesCount, loading])
  );

  const dismissFirstTimeTooltip = useCallback(async () => {
    setShowFirstTimeTooltip(false);
    await AsyncStorage.setItem(HAS_SEEN_HOME_GUIDANCE_KEY, 'true');
  }, []);

  return {
    showFirstTimeTooltip,
    dismissFirstTimeTooltip,
  };
}
