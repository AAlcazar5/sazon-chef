// Verifies the waitlist signup wires into emailService.sendWaitlistConfirmation
// per plans/launch.md#launch-marketing "Resend wiring for confirmation email".

const mockUpsert = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();
const mockSendWaitlistConfirmation = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    waitlistSignup: {
      upsert: (...a: unknown[]) => mockUpsert(...a),
      count: (...a: unknown[]) => mockCount(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
    },
  },
}));

jest.mock('@/services/emailService', () => ({
  emailService: {
    sendWaitlistConfirmation: (...a: unknown[]) => mockSendWaitlistConfirmation(...a),
  },
}));

import type { Request, Response } from 'express';
import { waitlistController } from '../../src/modules/waitlist/waitlistController';

interface MockResponse extends Partial<Response> {
  status: jest.Mock;
  json: jest.Mock;
}

function makeRes(): MockResponse {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as MockResponse;
}

function makeReq(body: unknown): Request {
  return { body } as Request;
}

const validBody = {
  email: 'cook@kitchen.com',
  topCuisine: 'Persian',
  macroGoal: 'flavor_balanced',
  dietary: ['Gluten'],
};

// Helper — wait for fire-and-forget promises to settle.
const flushAsync = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  mockUpsert.mockResolvedValue({
    id: 'wl_1',
    email: validBody.email,
    createdAt: new Date('2026-05-12T00:00:00Z'),
  });
  mockCount.mockResolvedValue(42);
  mockFindUnique.mockResolvedValue(null); // default: new signup
  mockSendWaitlistConfirmation.mockResolvedValue(true);
});

describe('waitlist signup → confirmation email wiring', () => {
  it('fires exactly one confirmation send on a new signup', async () => {
    const res = makeRes();
    await waitlistController.signup(makeReq(validBody), res as Response);
    await flushAsync();

    expect(mockSendWaitlistConfirmation).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('does NOT re-send when the email already exists (idempotent on re-signup)', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'wl_existing',
      email: validBody.email,
      createdAt: new Date('2026-05-01T00:00:00Z'),
    });

    const res = makeRes();
    await waitlistController.signup(makeReq(validBody), res as Response);
    await flushAsync();

    expect(mockSendWaitlistConfirmation).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('passes the captured cuisine to the email service so the body can interpolate it', async () => {
    const res = makeRes();
    await waitlistController.signup(
      makeReq({ ...validBody, topCuisine: 'Oaxacan' }),
      res as Response,
    );
    await flushAsync();

    expect(mockSendWaitlistConfirmation).toHaveBeenCalledWith(
      'cook@kitchen.com',
      'Oaxacan',
    );
  });

  it('passes a null cuisine through when the signup omitted it', async () => {
    const res = makeRes();
    await waitlistController.signup(
      makeReq({ email: 'just@email.com', topCuisine: null, macroGoal: null, dietary: [] }),
      res as Response,
    );
    await flushAsync();

    expect(mockSendWaitlistConfirmation).toHaveBeenCalledWith('just@email.com', null);
  });

  it('returns 200 even when the email send rejects (caught + logged, not propagated)', async () => {
    mockSendWaitlistConfirmation.mockRejectedValueOnce(new Error('Resend down'));

    const res = makeRes();
    await waitlistController.signup(makeReq(validBody), res as Response);
    await flushAsync();

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('skips the email when the upsert itself fails (no orphan confirmations)', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('db boom'));

    const res = makeRes();
    await waitlistController.signup(makeReq(validBody), res as Response);
    await flushAsync();

    expect(mockSendWaitlistConfirmation).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
