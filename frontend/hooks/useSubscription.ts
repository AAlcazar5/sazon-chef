// frontend/hooks/useSubscription.ts
// Subscription state + purchase flow. Native (iOS/Android) drives RevenueCat
// → StoreKit/Play Billing per Apple/Google guidelines. Web continues to use
// Stripe Checkout. Backend `getSubscription` is the unified source of truth —
// both Stripe and RevenueCat webhooks (E4) write the same User columns.

import { useState, useEffect, useCallback, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import { stripeApi } from '../lib/api';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  type PurchasesPackage,
} from '../lib/revenueCat';
import { HapticChoreography } from '../utils/hapticChoreography';

function isNativePlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export interface SubscriptionState {
  status: string; // free | trialing | active | past_due | canceled
  tier: string;   // free | premium
  isPremium: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  loading: boolean;
  error: string | null;
}

export interface SubscriptionOfferings {
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
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

const DEFAULT_OFFERINGS: SubscriptionOfferings = { monthly: null, annual: null };

function pickPackage(packages: PurchasesPackage[], interval: 'month' | 'year'): PurchasesPackage | null {
  // RC's package.identifier convention: $rc_monthly, $rc_annual, $rc_lifetime, …
  const wanted = interval === 'month' ? '$rc_monthly' : '$rc_annual';
  const direct = packages.find(p => p.identifier === wanted);
  if (direct) return direct;
  // Fallback: match by product identifier substring (handles custom packages
  // like 'sazon_membership_annual' where the RC identifier was renamed).
  const needle = interval === 'month' ? 'month' : 'annual';
  return packages.find(p => p.product.identifier.toLowerCase().includes(needle)) ?? null;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionState>(DEFAULT_STATE);
  const [offerings, setOfferings] = useState<SubscriptionOfferings>(DEFAULT_OFFERINGS);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
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

  // Pull RC offerings on mount (native only). On web this is a no-op;
  // pricing renders from Stripe-side defaults at the call site.
  useEffect(() => {
    if (!isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      const packages = await getOfferings();
      if (cancelled) return;
      setOfferings({
        monthly: pickPackage(packages, 'month'),
        annual: pickPackage(packages, 'year'),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Native: drive RevenueCat → StoreKit / Play Billing. The webhook then
   *         flips backend columns via E4; we refresh after.
   * Web:    open Stripe Checkout in the device browser.
   */
  const purchase = useCallback(
    async (interval: 'month' | 'year' = 'month') => {
      try {
        setCheckoutLoading(true);
        if (isNativePlatform()) {
          const pkg = interval === 'month' ? offerings.monthly : offerings.annual;
          if (!pkg) {
            setSubscription(prev => ({ ...prev, error: 'No offering available' }));
            return;
          }
          await purchasePackage(pkg);
          await fetchSubscription();
        } else {
          const res = await stripeApi.createCheckout(interval);
          const { url } = res.data;
          if (url) {
            await Linking.openURL(url);
          }
        }
      } catch (err: any) {
        // RC throws on user-cancel — silence that path; surface other errors.
        if (err?.userCancelled) return;
        const msg = err?.response?.data?.message || err?.message || 'Purchase failed';
        setSubscription(prev => ({ ...prev, error: msg }));
      } finally {
        setCheckoutLoading(false);
      }
    },
    [offerings.monthly, offerings.annual, fetchSubscription],
  );

  /**
   * Backwards-compat alias — older callsites still use `startCheckout`.
   */
  const startCheckout = purchase;

  /**
   * Restore previous purchases. Required by Apple guideline 3.1.1 — every
   * paywall must have a Restore button. Native runs RC restore + refreshes
   * server state; web just refreshes (Stripe receipts are server-side).
   */
  const restore = useCallback(async () => {
    try {
      setRestoreLoading(true);
      if (isNativePlatform()) {
        await restorePurchases();
      }
      await fetchSubscription();
    } catch (err: any) {
      const msg = err?.message || 'Restore failed';
      setSubscription(prev => ({ ...prev, error: msg }));
    } finally {
      setRestoreLoading(false);
    }
  }, [fetchSubscription]);

  /**
   * Manage subscription. iOS deep-links to App Store subscriptions, Android
   * to Play Store, web opens Stripe Customer Portal.
   */
  const openPortal = useCallback(async () => {
    try {
      setPortalLoading(true);
      if (Platform.OS === 'ios') {
        await Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else if (Platform.OS === 'android') {
        await Linking.openURL('https://play.google.com/store/account/subscriptions');
      } else {
        const res = await stripeApi.createPortal();
        const { url } = res.data;
        if (url) {
          await Linking.openURL(url);
        }
      }
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
    offerings,
    checkoutLoading,
    portalLoading,
    restoreLoading,
    trialDaysLeft,
    showPremiumCelebration,
    dismissPremiumCelebration,
    refresh: fetchSubscription,
    purchase,
    restore,
    startCheckout, // legacy alias of `purchase` — keep for compat
    openPortal,
  };
}
