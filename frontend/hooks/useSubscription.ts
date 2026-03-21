// frontend/hooks/useSubscription.ts
// Hook for managing subscription state and Stripe checkout flows

import { useState, useEffect, useCallback, useRef } from 'react';
import { Linking } from 'react-native';
import { stripeApi } from '../lib/api';
import { HapticChoreography } from '../utils/hapticChoreography';

export interface SubscriptionState {
  status: string; // free | trialing | active | past_due | canceled
  tier: string;   // free | premium
  isPremium: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_STATE: SubscriptionState = {
  status: 'free',
  tier: 'free',
  isPremium: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
  loading: true,
  error: null,
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionState>(DEFAULT_STATE);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showPremiumCelebration, setShowPremiumCelebration] = useState(false);
  const wasPremiumRef = useRef<boolean | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setSubscription((prev) => ({ ...prev, loading: true, error: null }));
      const res = await stripeApi.getSubscription();
      const data = res.data;
      const newIsPremium = data.isPremium;

      // Detect fresh conversion: was not premium → now premium
      if (wasPremiumRef.current === false && newIsPremium) {
        setShowPremiumCelebration(true);
        HapticChoreography.premiumConversion();
      }
      wasPremiumRef.current = newIsPremium;

      setSubscription({
        status: data.status,
        tier: data.tier,
        isPremium: newIsPremium,
        trialEndsAt: data.trialEndsAt,
        currentPeriodEnd: data.currentPeriodEnd,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load subscription';
      setSubscription((prev) => ({ ...prev, loading: false, error: msg }));
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  /**
   * Opens Stripe Checkout in the device browser.
   * interval: 'month' | 'year'
   */
  const startCheckout = useCallback(async (interval: 'month' | 'year' = 'month') => {
    try {
      setCheckoutLoading(true);
      const res = await stripeApi.createCheckout(interval);
      const { url } = res.data;
      if (url) {
        await Linking.openURL(url);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
    } finally {
      setCheckoutLoading(false);
    }
  }, []);

  /**
   * Opens Stripe Customer Portal so the user can manage/cancel their subscription.
   */
  const openPortal = useCallback(async () => {
    try {
      setPortalLoading(true);
      const res = await stripeApi.createPortal();
      const { url } = res.data;
      if (url) {
        await Linking.openURL(url);
      }
    } catch (err: any) {
      console.error('Portal error:', err);
    } finally {
      setPortalLoading(false);
    }
  }, []);

  /** Days remaining in trial (null if not trialing) */
  const trialDaysLeft: number | null = (() => {
    if (!subscription.trialEndsAt) return null;
    const ms = new Date(subscription.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  })();

  const dismissPremiumCelebration = useCallback(() => {
    setShowPremiumCelebration(false);
  }, []);

  return {
    subscription,
    checkoutLoading,
    portalLoading,
    trialDaysLeft,
    showPremiumCelebration,
    dismissPremiumCelebration,
    refresh: fetchSubscription,
    startCheckout,
    openPortal,
  };
}
