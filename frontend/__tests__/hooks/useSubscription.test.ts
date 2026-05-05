// frontend/__tests__/hooks/useSubscription.test.ts
import { renderHook, waitFor, act } from '@testing-library/react-native';

jest.mock('../../lib/api', () => ({
  stripeApi: {
    getSubscription: jest.fn(),
    createCheckout: jest.fn(),
    createPortal: jest.fn(),
  },
}));

jest.mock('../../lib/revenueCat', () => ({
  getOfferings: jest.fn().mockResolvedValue([]),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
}));

import { Platform } from 'react-native';
import { useSubscription } from '../../hooks/useSubscription';
import { stripeApi } from '../../lib/api';

function setPlatform(os: 'ios' | 'android' | 'web') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

const mockStripeApi = stripeApi as jest.Mocked<typeof stripeApi>;

describe('useSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches subscription on mount and returns isPremium=false for free tier', async () => {
    mockStripeApi.getSubscription.mockResolvedValue({
      data: { status: 'free', tier: 'free', isPremium: false, trialEndsAt: null, currentPeriodEnd: null },
    } as any);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.subscription.loading).toBe(false);
    });

    expect(result.current.subscription.isPremium).toBe(false);
    expect(result.current.subscription.tier).toBe('free');
  });

  it('returns isPremium=true for active premium', async () => {
    const periodEnd = new Date(Date.now() + 86400 * 30 * 1000).toISOString();
    mockStripeApi.getSubscription.mockResolvedValue({
      data: { status: 'active', tier: 'premium', isPremium: true, trialEndsAt: null, currentPeriodEnd: periodEnd },
    } as any);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.subscription.loading).toBe(false);
    });

    expect(result.current.subscription.isPremium).toBe(true);
    expect(result.current.subscription.tier).toBe('premium');
  });

  it('calculates trialDaysLeft for trialing user', async () => {
    const trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    mockStripeApi.getSubscription.mockResolvedValue({
      data: { status: 'trialing', tier: 'premium', isPremium: true, trialEndsAt, currentPeriodEnd: trialEndsAt },
    } as any);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.subscription.loading).toBe(false);
    });

    expect(result.current.trialDaysLeft).toBeGreaterThanOrEqual(4);
    expect(result.current.trialDaysLeft).toBeLessThanOrEqual(5);
  });

  it('trialDaysLeft is null when not trialing', async () => {
    mockStripeApi.getSubscription.mockResolvedValue({
      data: { status: 'free', tier: 'free', isPremium: false, trialEndsAt: null, currentPeriodEnd: null },
    } as any);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.subscription.loading).toBe(false);
    });

    expect(result.current.trialDaysLeft).toBeNull();
  });

  it('startCheckout calls createCheckout API with interval (web build)', async () => {
    setPlatform('web');
    mockStripeApi.getSubscription.mockResolvedValue({
      data: { status: 'free', tier: 'free', isPremium: false, trialEndsAt: null, currentPeriodEnd: null },
    } as any);
    mockStripeApi.createCheckout.mockResolvedValue({
      data: { url: 'https://checkout.stripe.com/test', sessionId: 'cs_test' },
    } as any);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.subscription.loading).toBe(false);
    });

    await act(async () => {
      await result.current.startCheckout('month');
    });

    expect(mockStripeApi.createCheckout).toHaveBeenCalledWith('month');
  });

  it('startCheckout supports annual interval (web build)', async () => {
    setPlatform('web');
    mockStripeApi.getSubscription.mockResolvedValue({
      data: { status: 'free', tier: 'free', isPremium: false, trialEndsAt: null, currentPeriodEnd: null },
    } as any);
    mockStripeApi.createCheckout.mockResolvedValue({
      data: { url: 'https://checkout.stripe.com/test', sessionId: 'cs_test' },
    } as any);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.subscription.loading).toBe(false);
    });

    await act(async () => {
      await result.current.startCheckout('year');
    });

    expect(mockStripeApi.createCheckout).toHaveBeenCalledWith('year');
  });

  it('openPortal calls createPortal API (web build)', async () => {
    setPlatform('web');
    mockStripeApi.getSubscription.mockResolvedValue({
      data: { status: 'active', tier: 'premium', isPremium: true, trialEndsAt: null, currentPeriodEnd: null },
    } as any);
    mockStripeApi.createPortal.mockResolvedValue({
      data: { url: 'https://billing.stripe.com/test' },
    } as any);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.subscription.loading).toBe(false);
    });

    await act(async () => {
      await result.current.openPortal();
    });

    expect(mockStripeApi.createPortal).toHaveBeenCalled();
  });

  it('sets error state when fetch fails', async () => {
    mockStripeApi.getSubscription.mockRejectedValue({
      response: { data: { message: 'Network error' } },
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.subscription.loading).toBe(false);
    });

    expect(result.current.subscription.error).toBe('Network error');
  });

  it('refresh re-fetches subscription data', async () => {
    mockStripeApi.getSubscription.mockResolvedValue({
      data: { status: 'free', tier: 'free', isPremium: false, trialEndsAt: null, currentPeriodEnd: null },
    } as any);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.subscription.loading).toBe(false);
    });

    mockStripeApi.getSubscription.mockResolvedValue({
      data: { status: 'active', tier: 'premium', isPremium: true, trialEndsAt: null, currentPeriodEnd: null },
    } as any);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.subscription.isPremium).toBe(true);
    expect(mockStripeApi.getSubscription).toHaveBeenCalledTimes(2);
  });

  describe('native (iOS/Android) — RevenueCat path', () => {
    let getOfferings: jest.Mock;
    let purchasePackage: jest.Mock;
    let restorePurchases: jest.Mock;

    beforeEach(() => {
      const rc = require('../../lib/revenueCat');
      getOfferings = rc.getOfferings;
      purchasePackage = rc.purchasePackage;
      restorePurchases = rc.restorePurchases;
      getOfferings.mockReset().mockResolvedValue([
        {
          identifier: '$rc_monthly',
          product: { identifier: 'sazon_membership_monthly', priceString: '$9.00 / mo', price: 9 },
        },
        {
          identifier: '$rc_annual',
          product: { identifier: 'sazon_membership_annual', priceString: '$60.00 / yr', price: 60 },
        },
      ]);
      purchasePackage.mockReset();
      restorePurchases.mockReset();
    });

    it('purchase routes to RevenueCat purchasePackage on iOS, then refreshes', async () => {
      setPlatform('ios');
      mockStripeApi.getSubscription
        .mockResolvedValueOnce({
          data: { status: 'free', tier: 'free', isPremium: false, trialEndsAt: null, currentPeriodEnd: null },
        } as any)
        .mockResolvedValueOnce({
          data: { status: 'active', tier: 'premium', isPremium: true, trialEndsAt: null, currentPeriodEnd: null },
        } as any);
      purchasePackage.mockResolvedValue({
        entitlements: { active: { 'Sazon Chef Pro': { isActive: true, productIdentifier: 'sazon_membership_annual' } } },
        originalAppUserId: 'u',
      });

      const { result } = renderHook(() => useSubscription());
      await waitFor(() => expect(result.current.subscription.loading).toBe(false));
      await waitFor(() => expect(result.current.offerings.annual).not.toBeNull());

      await act(async () => {
        await result.current.purchase('year');
      });

      expect(purchasePackage).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: '$rc_annual' }),
      );
      expect(mockStripeApi.createCheckout).not.toHaveBeenCalled();
      expect(result.current.subscription.isPremium).toBe(true);
    });

    it('purchase silently swallows user-cancel from RC', async () => {
      setPlatform('ios');
      mockStripeApi.getSubscription.mockResolvedValue({
        data: { status: 'free', tier: 'free', isPremium: false, trialEndsAt: null, currentPeriodEnd: null },
      } as any);
      purchasePackage.mockRejectedValue({ userCancelled: true });

      const { result } = renderHook(() => useSubscription());
      await waitFor(() => expect(result.current.offerings.monthly).not.toBeNull());

      await act(async () => {
        await result.current.purchase('month');
      });

      expect(result.current.subscription.error).toBeNull();
    });

    it('restore calls RC restorePurchases + refreshes server state', async () => {
      setPlatform('android');
      mockStripeApi.getSubscription
        .mockResolvedValueOnce({
          data: { status: 'free', tier: 'free', isPremium: false, trialEndsAt: null, currentPeriodEnd: null },
        } as any)
        .mockResolvedValueOnce({
          data: { status: 'active', tier: 'premium', isPremium: true, trialEndsAt: null, currentPeriodEnd: null },
        } as any);
      restorePurchases.mockResolvedValue({ entitlements: { active: {} }, originalAppUserId: 'u' });

      const { result } = renderHook(() => useSubscription());
      await waitFor(() => expect(result.current.subscription.loading).toBe(false));

      await act(async () => {
        await result.current.restore();
      });

      expect(restorePurchases).toHaveBeenCalled();
      expect(result.current.subscription.isPremium).toBe(true);
    });

    it('openPortal deep-links to App Store subscriptions on iOS', async () => {
      setPlatform('ios');
      const Linking = require('react-native').Linking;
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
      mockStripeApi.getSubscription.mockResolvedValue({
        data: { status: 'active', tier: 'premium', isPremium: true, trialEndsAt: null, currentPeriodEnd: null },
      } as any);

      const { result } = renderHook(() => useSubscription());
      await waitFor(() => expect(result.current.subscription.loading).toBe(false));

      await act(async () => {
        await result.current.openPortal();
      });

      expect(openURL).toHaveBeenCalledWith(expect.stringContaining('apps.apple.com'));
      expect(mockStripeApi.createPortal).not.toHaveBeenCalled();
      openURL.mockRestore();
    });

    it('openPortal deep-links to Play subscriptions on Android', async () => {
      setPlatform('android');
      const Linking = require('react-native').Linking;
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
      mockStripeApi.getSubscription.mockResolvedValue({
        data: { status: 'active', tier: 'premium', isPremium: true, trialEndsAt: null, currentPeriodEnd: null },
      } as any);

      const { result } = renderHook(() => useSubscription());
      await waitFor(() => expect(result.current.subscription.loading).toBe(false));

      await act(async () => {
        await result.current.openPortal();
      });

      expect(openURL).toHaveBeenCalledWith(expect.stringContaining('play.google.com'));
      openURL.mockRestore();
    });
  });
});
