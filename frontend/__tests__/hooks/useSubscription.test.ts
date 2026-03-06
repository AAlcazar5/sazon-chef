// frontend/__tests__/hooks/useSubscription.test.ts
import { renderHook, waitFor, act } from '@testing-library/react-native';

jest.mock('../../lib/api', () => ({
  stripeApi: {
    getSubscription: jest.fn(),
    createCheckout: jest.fn(),
    createPortal: jest.fn(),
  },
}));

import { useSubscription } from '../../hooks/useSubscription';
import { stripeApi } from '../../lib/api';

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

  it('startCheckout calls createCheckout API with interval', async () => {
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

  it('startCheckout supports annual interval', async () => {
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

  it('openPortal calls createPortal API', async () => {
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
});
