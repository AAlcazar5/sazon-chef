// Pre-launch waitlist controller — public endpoint, no auth.

const mockUpsert = jest.fn();
const mockCount = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    waitlistSignup: {
      upsert: (...a: unknown[]) => mockUpsert(...a),
      count: (...a: unknown[]) => mockCount(...a),
    },
  },
}));

import type { Request, Response } from 'express';
import { waitlistController } from '../../../src/modules/waitlist/waitlistController';

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

beforeEach(() => {
  jest.clearAllMocks();
  mockUpsert.mockResolvedValue({
    id: 'wl_1',
    email: validBody.email,
    createdAt: new Date('2026-05-05T00:00:00Z'),
  });
  mockCount.mockResolvedValue(42);
});

describe('waitlistController.signup', () => {
  it('200s with success on a valid signup', async () => {
    const res = makeRes();
    await waitlistController.signup(makeReq(validBody), res as Response);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ id: 'wl_1', position: 42 }),
      }),
    );
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('upserts on email so a repeat signup is idempotent', async () => {
    const res = makeRes();
    await waitlistController.signup(makeReq(validBody), res as Response);

    const args = mockUpsert.mock.calls[0][0];
    expect(args.where).toEqual({ email: 'cook@kitchen.com' });
    expect(args.create.email).toBe('cook@kitchen.com');
    expect(args.create.topCuisine).toBe('Persian');
    expect(args.create.macroGoal).toBe('flavor_balanced');
    expect(JSON.parse(args.create.dietary)).toEqual(['Gluten']);
    expect(args.update.topCuisine).toBe('Persian');
  });

  it('lowercases and trims the email before persisting', async () => {
    const res = makeRes();
    await waitlistController.signup(
      makeReq({ ...validBody, email: '  COOK@Kitchen.com  ' }),
      res as Response,
    );

    const args = mockUpsert.mock.calls[0][0];
    expect(args.where.email).toBe('cook@kitchen.com');
    expect(args.create.email).toBe('cook@kitchen.com');
  });

  it('accepts a minimal payload (email only) with nullable picks', async () => {
    const res = makeRes();
    await waitlistController.signup(
      makeReq({ email: 'just@email.com', topCuisine: null, macroGoal: null, dietary: [] }),
      res as Response,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    const args = mockUpsert.mock.calls[0][0];
    expect(args.create.topCuisine).toBeNull();
    expect(args.create.macroGoal).toBeNull();
    expect(JSON.parse(args.create.dietary)).toEqual([]);
  });

  it('400s on an invalid email', async () => {
    const res = makeRes();
    await waitlistController.signup(
      makeReq({ ...validBody, email: 'not-an-email' }),
      res as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('400s on an invalid macroGoal value', async () => {
    const res = makeRes();
    await waitlistController.signup(
      makeReq({ ...validBody, macroGoal: 'bulk' }),
      res as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('400s when dietary is not an array', async () => {
    const res = makeRes();
    await waitlistController.signup(
      makeReq({ ...validBody, dietary: 'Gluten' }),
      res as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('400s when the body is missing entirely', async () => {
    const res = makeRes();
    await waitlistController.signup(makeReq(undefined), res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('caps top-level field length to prevent abuse', async () => {
    const res = makeRes();
    const giant = 'a'.repeat(500);
    await waitlistController.signup(
      makeReq({ ...validBody, topCuisine: giant }),
      res as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('does not leak the upserted email back to the client', async () => {
    const res = makeRes();
    await waitlistController.signup(makeReq(validBody), res as Response);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.data?.email).toBeUndefined();
  });

  it('500s on a database error', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('boom'));
    const res = makeRes();
    await waitlistController.signup(makeReq(validBody), res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it('persists optional source attribution when provided', async () => {
    const res = makeRes();
    await waitlistController.signup(
      makeReq({ ...validBody, source: 'tiktok' }),
      res as Response,
    );

    const args = mockUpsert.mock.calls[0][0];
    expect(args.create.source).toBe('tiktok');
  });
});
