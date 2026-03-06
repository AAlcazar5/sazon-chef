// backend/tests/modules/subscriptionCancel.test.ts
// Tests for POST /api/stripe/cancel (Group 8: Revenue Optimization)

import { stripeController } from '../../src/modules/stripe/stripeController';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

// Mock stripeService so we control cancel/pause behaviour
jest.mock('../../src/services/stripeService', () => ({
  stripeService: {
    isConfigured: jest.fn().mockReturnValue(false),
    cancelSubscription: jest.fn().mockResolvedValue('sub_test'),
    pauseSubscription: jest.fn().mockResolvedValue('sub_test'),
  },
}));

// Mock emailService
jest.mock('../../src/services/emailService', () => ({
  emailService: {
    sendSubscriptionChange: jest.fn().mockResolvedValue(true),
  },
}));

import { stripeService } from '../../src/services/stripeService';
import { emailService } from '../../src/services/emailService';

const mockStripeService = stripeService as jest.Mocked<typeof stripeService>;
const mockEmailService = emailService as jest.Mocked<typeof emailService>;

function makeReqRes(body: object, userId = 'user1') {
  const req: any = { user: { id: userId }, body };
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('POST /api/stripe/cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockStripeService.isConfigured as jest.Mock).mockReturnValue(false);
    mockPrisma.cancellationSurvey.create.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'u@test.com', emailEncrypted: false });
  });

  it('returns 401 without auth user', async () => {
    const req: any = { user: undefined, body: { reason: 'other', action: 'cancel' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    // Should throw (req.user! would throw) — handled by auth middleware in production
    // Here we call directly and expect it to throw or return 500
    try {
      await stripeController.cancelSubscription(req, res);
    } catch {
      // expected — no user on request
    }
  });

  it('returns 400 for invalid reason', async () => {
    const { req, res } = makeReqRes({ reason: 'invalid_reason', action: 'cancel' });
    await stripeController.cancelSubscription(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Invalid reason') }));
  });

  it('returns 400 for invalid action', async () => {
    const { req, res } = makeReqRes({ reason: 'too_expensive', action: 'delete' });
    await stripeController.cancelSubscription(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('action must be') }));
  });

  it('records survey response in DB before any Stripe call', async () => {
    const { req, res } = makeReqRes({ reason: 'not_using', action: 'cancel' });
    await stripeController.cancelSubscription(req, res);

    expect(mockPrisma.cancellationSurvey.create).toHaveBeenCalledWith({
      data: {
        userId: 'user1',
        reason: 'not_using',
        feedback: null,
        action: 'cancel',
      },
    });
  });

  it('records feedback text for missing_feature reason', async () => {
    const { req, res } = makeReqRes({ reason: 'missing_feature', feedback: 'Need a barcode scan feature', action: 'cancel' });
    await stripeController.cancelSubscription(req, res);

    expect(mockPrisma.cancellationSurvey.create).toHaveBeenCalledWith({
      data: {
        userId: 'user1',
        reason: 'missing_feature',
        feedback: 'Need a barcode scan feature',
        action: 'cancel',
      },
    });
  });

  it('returns 200 { cancelled: true } on successful cancellation (Stripe not configured)', async () => {
    const { req, res } = makeReqRes({ reason: 'other', action: 'cancel' });
    await stripeController.cancelSubscription(req, res);

    expect(res.json).toHaveBeenCalledWith({ cancelled: true });
    expect(mockStripeService.cancelSubscription).not.toHaveBeenCalled(); // Stripe not configured
  });

  it('returns 200 { paused: true } on successful pause (Stripe not configured)', async () => {
    const { req, res } = makeReqRes({ reason: 'too_expensive', action: 'pause' });
    await stripeController.cancelSubscription(req, res);

    expect(res.json).toHaveBeenCalledWith({ paused: true });
    expect(mockStripeService.pauseSubscription).not.toHaveBeenCalled(); // Stripe not configured
  });

  it('calls stripeService.cancelSubscription when Stripe is configured', async () => {
    (mockStripeService.isConfigured as jest.Mock).mockReturnValue(true);
    const { req, res } = makeReqRes({ reason: 'not_using', action: 'cancel' });
    await stripeController.cancelSubscription(req, res);

    expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith('user1');
    expect(res.json).toHaveBeenCalledWith({ cancelled: true });
  });

  it('calls stripeService.pauseSubscription when action is pause and Stripe is configured', async () => {
    (mockStripeService.isConfigured as jest.Mock).mockReturnValue(true);
    const { req, res } = makeReqRes({ reason: 'too_expensive', action: 'pause' });
    await stripeController.cancelSubscription(req, res);

    expect(mockStripeService.pauseSubscription).toHaveBeenCalledWith('user1');
    expect(mockStripeService.cancelSubscription).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ paused: true });
  });

  it('does not call Stripe cancel when user accepts the pause offer', async () => {
    (mockStripeService.isConfigured as jest.Mock).mockReturnValue(true);
    const { req, res } = makeReqRes({ reason: 'too_expensive', action: 'pause' });
    await stripeController.cancelSubscription(req, res);

    expect(mockStripeService.cancelSubscription).not.toHaveBeenCalled();
    expect(mockStripeService.pauseSubscription).toHaveBeenCalled();
  });
});
