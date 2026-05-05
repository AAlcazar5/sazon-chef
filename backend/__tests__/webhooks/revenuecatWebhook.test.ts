// backend/__tests__/webhooks/revenuecatWebhook.test.ts
// ROADMAP 4.0 E4 — RevenueCat webhook integration spec.
//
// Mocks Prisma so the test exercises the handler logic, the auth gate, and
// the Stripe-parity column writes — without needing a live DB.

const mockEventFindUnique = jest.fn();
const mockEventCreate = jest.fn();
const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    revenueCatWebhookEvent: {
      findUnique: (...a: unknown[]) => mockEventFindUnique(...a),
      create: (...a: unknown[]) => mockEventCreate(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
    },
  },
}));

import express from 'express';
import request from 'supertest';

const ORIGINAL_AUTH = process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;

function buildApp() {
  // Reset module cache so the handler picks up the env var we just set.
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { revenuecatRoutes } = require('../../src/modules/revenuecat/revenuecatRoutes');
  const app = express();
  app.use('/api/webhooks/revenuecat', revenuecatRoutes);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.REVENUECAT_WEBHOOK_AUTH_HEADER = 'Bearer test-secret';
  mockEventFindUnique.mockResolvedValue(null);
  mockEventCreate.mockResolvedValue({});
  mockUserFindUnique.mockResolvedValue({ id: 'user_42', revenueCatAppUserId: 'user_42' });
  mockUserUpdate.mockResolvedValue({});
});

afterAll(() => {
  process.env.REVENUECAT_WEBHOOK_AUTH_HEADER = ORIGINAL_AUTH;
});

function eventBody(type: string, overrides: Record<string, unknown> = {}) {
  return {
    api_version: '1.0',
    event: {
      id: `evt_${type}_${Math.random().toString(36).slice(2)}`,
      type,
      app_user_id: 'user_42',
      product_id: 'sazon_membership_annual',
      expiration_at_ms: Date.now() + 365 * 24 * 60 * 60 * 1000,
      ...overrides,
    },
  };
}

describe('RevenueCat webhook (E4)', () => {
  it('rejects requests without the configured auth header (401)', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .send(eventBody('INITIAL_PURCHASE'));
    expect(res.status).toBe(401);
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it('rejects when REVENUECAT_WEBHOOK_AUTH_HEADER is unset (500)', async () => {
    delete process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;
    const res = await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send(eventBody('INITIAL_PURCHASE'));
    expect(res.status).toBe(500);
  });

  it('400 on malformed payload', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send({ event: { id: 'has-no-type' } });
    expect(res.status).toBe(400);
  });

  it('INITIAL_PURCHASE → status active, tier premium, period_end set', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send(eventBody('INITIAL_PURCHASE'));

    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_42' },
        data: expect.objectContaining({
          subscriptionStatus: 'active',
          subscriptionTier: 'premium',
          cancelAtPeriodEnd: false,
          trialEndsAt: null,
        }),
      }),
    );
  });

  it('RENEWAL refreshes the period end', async () => {
    await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send(eventBody('RENEWAL'));
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subscriptionStatus: 'active', subscriptionTier: 'premium' }),
      }),
    );
  });

  it('CANCELLATION sets cancelAtPeriodEnd, keeps tier active until EXPIRATION', async () => {
    await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send(eventBody('CANCELLATION'));
    const call = mockUserUpdate.mock.calls[0][0];
    expect(call.data.cancelAtPeriodEnd).toBe(true);
    expect(call.data.subscriptionStatus).toBeUndefined();
    expect(call.data.subscriptionTier).toBeUndefined();
  });

  it('EXPIRATION downgrades to free + canceled', async () => {
    await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send(eventBody('EXPIRATION'));
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionStatus: 'canceled',
          subscriptionTier: 'free',
          currentPeriodEnd: null,
          trialEndsAt: null,
        }),
      }),
    );
  });

  it('TRIAL_STARTED → trialing + trialEndsAt', async () => {
    await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send(eventBody('TRIAL_STARTED'));
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subscriptionStatus: 'trialing' }),
      }),
    );
  });

  it('TRIAL_CONVERTED → active + clears trialEndsAt', async () => {
    await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send(eventBody('TRIAL_CONVERTED'));
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subscriptionStatus: 'active', trialEndsAt: null }),
      }),
    );
  });

  it('BILLING_ISSUE → past_due', async () => {
    await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send(eventBody('BILLING_ISSUE'));
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { subscriptionStatus: 'past_due' } }),
    );
  });

  it('idempotent — duplicate event id returns 200 + duplicate flag, no user update', async () => {
    mockEventFindUnique.mockResolvedValueOnce({ id: 'log_dup' });
    const res = await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send(eventBody('RENEWAL'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ duplicate: true }));
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it('Stripe parity — same status/tier/currentPeriodEnd columns get set', async () => {
    await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send(eventBody('INITIAL_PURCHASE'));
    const data = mockUserUpdate.mock.calls[0][0].data;
    // Same columns Stripe writes (see stripeWebhookHandler / stripeService.subscriptionToUserData).
    expect(data).toEqual(
      expect.objectContaining({
        subscriptionStatus: expect.any(String),
        subscriptionTier: expect.any(String),
      }),
    );
    expect(data.currentPeriodEnd).toBeInstanceOf(Date);
  });

  it('logs every event in revenueCatWebhookEvent (audit)', async () => {
    await request(buildApp())
      .post('/api/webhooks/revenuecat/webhook')
      .set('Authorization', 'Bearer test-secret')
      .send(eventBody('INITIAL_PURCHASE'));
    expect(mockEventCreate).toHaveBeenCalledTimes(1);
    const call = mockEventCreate.mock.calls[0][0];
    expect(call.data.type).toBe('INITIAL_PURCHASE');
    expect(typeof call.data.data).toBe('string'); // JSON-serialized event
  });
});
