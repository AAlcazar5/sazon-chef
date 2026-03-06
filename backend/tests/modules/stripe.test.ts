// backend/tests/modules/stripe.test.ts
// Tests for Stripe service, webhook handler, and requirePremium middleware

import { stripeService } from '../../src/services/stripeService';
import { requirePremium } from '../../src/middleware/requirePremium';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

// ─── stripeService ────────────────────────────────────────────────────────────

describe('stripeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID = 'price_monthly';
    process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID = 'price_annual';
  });

  describe('subscriptionToUserData', () => {
    it('maps active subscription to premium tier', () => {
      const now = Math.floor(Date.now() / 1000) + 86400 * 30;
      const sub: any = { status: 'active', current_period_end: now, trial_end: null };
      const data = stripeService.subscriptionToUserData(sub);
      expect(data.subscriptionStatus).toBe('active');
      expect(data.subscriptionTier).toBe('premium');
      expect(data.trialEndsAt).toBeNull();
      expect(data.currentPeriodEnd).toBeInstanceOf(Date);
    });

    it('maps trialing subscription to premium tier with trialEndsAt', () => {
      const now = Math.floor(Date.now() / 1000);
      const trialEnd = now + 86400 * 7;
      const sub: any = { status: 'trialing', current_period_end: now, trial_end: trialEnd };
      const data = stripeService.subscriptionToUserData(sub);
      expect(data.subscriptionTier).toBe('premium');
      expect(data.trialEndsAt).toBeInstanceOf(Date);
    });

    it('maps canceled subscription to free tier', () => {
      const sub: any = { status: 'canceled', current_period_end: Math.floor(Date.now() / 1000), trial_end: null };
      const data = stripeService.subscriptionToUserData(sub);
      expect(data.subscriptionTier).toBe('free');
    });

    it('maps past_due subscription to free tier', () => {
      const sub: any = { status: 'past_due', current_period_end: Math.floor(Date.now() / 1000), trial_end: null };
      const data = stripeService.subscriptionToUserData(sub);
      expect(data.subscriptionTier).toBe('free');
    });
  });

  describe('getOrCreateCustomer', () => {
    it('returns existing stripeCustomerId without calling Stripe', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user1',
        stripeCustomerId: 'cus_existing',
      });

      const customerId = await stripeService.getOrCreateCustomer('user1');
      expect(customerId).toBe('cus_existing');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('creates a new Stripe customer and persists stripeCustomerId', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user1',
        stripeCustomerId: null,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const customerId = await stripeService.getOrCreateCustomer('user1');
      // The stripe mock in setup.ts returns 'cus_test'
      expect(customerId).toBe('cus_test');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { stripeCustomerId: 'cus_test' },
      });
    });
  });
});

// ─── requirePremium middleware ────────────────────────────────────────────────

describe('requirePremium middleware', () => {
  function mockReqRes(userId = 'user1') {
    const req: any = { user: { id: userId } };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls next() when user has active premium', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionTier: 'premium',
      subscriptionStatus: 'active',
    });
    const { req, res, next } = mockReqRes();
    await requirePremium(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when user is trialing premium', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionTier: 'premium',
      subscriptionStatus: 'trialing',
    });
    const { req, res, next } = mockReqRes();
    await requirePremium(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 402 PREMIUM_REQUIRED for free tier users', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionTier: 'free',
      subscriptionStatus: 'free',
    });
    const { req, res, next } = mockReqRes();
    await requirePremium(req, res, next);
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'PREMIUM_REQUIRED' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 402 for premium user with canceled status', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionTier: 'premium',
      subscriptionStatus: 'canceled',
    });
    const { req, res, next } = mockReqRes();
    await requirePremium(req, res, next);
    expect(res.status).toHaveBeenCalledWith(402);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when no user on request', async () => {
    const req: any = { user: undefined };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await requirePremium(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when user not found in DB', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const { req, res, next } = mockReqRes();
    await requirePremium(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─── Stripe webhook handler ───────────────────────────────────────────────────
// Mock stripeService so webhook tests don't depend on real Stripe SDK init

jest.mock('../../src/services/stripeService', () => {
  const real = jest.requireActual('../../src/services/stripeService');
  return {
    stripeService: {
      ...real.stripeService,
      constructWebhookEvent: jest.fn(),
      subscriptionToUserData: real.stripeService.subscriptionToUserData,
      getSubscription: jest.fn(),
    },
  };
});

import { handleStripeWebhook } from '../../src/modules/stripe/stripeWebhookHandler';

const mockStripeService = stripeService as jest.Mocked<typeof stripeService>;

describe('Stripe webhook handler', () => {
  function makeEvent(type: string, obj: any, id = 'evt_test') {
    return { id, type, data: { object: obj } };
  }

  function mockReqRes(event: any) {
    const req: any = {
      headers: { 'stripe-signature': 'valid-sig' },
      body: Buffer.from(JSON.stringify(event)),
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return { req, res };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    mockPrisma.stripeWebhookEvent.create.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({});
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const req: any = { headers: {}, body: Buffer.from('{}') };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handleStripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when signature verification fails', async () => {
    mockStripeService.constructWebhookEvent.mockImplementation(() => {
      throw new Error('Signature mismatch');
    });
    const { req, res } = mockReqRes({});
    await handleStripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with duplicate:true for already-processed events', async () => {
    const event = makeEvent('customer.subscription.updated', {
      status: 'active', customer: 'cus_x', metadata: {},
      current_period_end: 9999999999, trial_end: null,
    });
    mockStripeService.constructWebhookEvent.mockReturnValue(event as any);
    mockPrisma.stripeWebhookEvent.findUnique.mockResolvedValue({ id: 'existing' });

    const { req, res } = mockReqRes(event);
    await handleStripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ duplicate: true }));
  });

  it('processes customer.subscription.updated and updates user', async () => {
    const obj = {
      id: 'sub_test', status: 'active', customer: 'cus_test',
      metadata: { userId: 'user1' },
      current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
      trial_end: null,
    };
    const event = makeEvent('customer.subscription.updated', obj, 'evt_upd');
    mockStripeService.constructWebhookEvent.mockReturnValue(event as any);

    const { req, res } = mockReqRes(event);
    await handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user1' },
        data: expect.objectContaining({ subscriptionStatus: 'active', subscriptionTier: 'premium' }),
      }),
    );
  });

  it('processes customer.subscription.deleted and resets user to free', async () => {
    const obj = {
      id: 'sub_test', status: 'canceled', customer: 'cus_test',
      metadata: { userId: 'user1' },
      current_period_end: Math.floor(Date.now() / 1000),
      trial_end: null,
    };
    const event = makeEvent('customer.subscription.deleted', obj, 'evt_del');
    mockStripeService.constructWebhookEvent.mockReturnValue(event as any);

    const { req, res } = mockReqRes(event);
    await handleStripeWebhook(req, res);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user1' },
        data: expect.objectContaining({ subscriptionStatus: 'canceled', subscriptionTier: 'free' }),
      }),
    );
  });

  it('handles invoice.payment_failed and sets past_due status', async () => {
    const obj = {
      customer: 'cus_test',
      metadata: { userId: 'user1' },
      subscription: null,
    };
    const event = makeEvent('invoice.payment_failed', obj, 'evt_fail');
    mockStripeService.constructWebhookEvent.mockReturnValue(event as any);
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'u@test.com', emailEncrypted: false });

    const { req, res } = mockReqRes(event);
    await handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user1' },
        data: expect.objectContaining({ subscriptionStatus: 'past_due' }),
      }),
    );
  });

  it('returns 200 for unknown event types (graceful no-op)', async () => {
    const event = makeEvent('some.unknown.event', {}, 'evt_unknown');
    mockStripeService.constructWebhookEvent.mockReturnValue(event as any);

    const { req, res } = mockReqRes(event);
    await handleStripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
