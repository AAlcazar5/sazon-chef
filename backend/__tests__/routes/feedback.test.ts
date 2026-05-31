// Tier Q — Beta feedback intake.
//
// `POST /api/feedback` accepts free-text feedback from beta builds plus
// optional build/device/version context. Persists to BetaFeedback and
// emits a structured log. Public route (no auth header required) so
// testers may submit while signed out.

const mockCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    betaFeedback: {
      create: (...a: unknown[]) => mockCreate(...a),
    },
  },
}));

import request from 'supertest';
import express from 'express';
import { feedbackRoutes } from '../../src/modules/feedback/feedbackRoutes';

function makeApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/feedback', feedbackRoutes);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockImplementation((args: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: 'fb_test_123', ...args.data }),
  );
});

describe('Tier Q: POST /api/feedback', () => {
  it('accepts a minimal feedback payload and returns the persisted id', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'The plate generator is amazing.' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('fb_test_123');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].data).toMatchObject({
      message: 'The plate generator is amazing.',
      userId: null,
    });
  });

  it('persists the full schema (message + context fields)', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/feedback')
      .send({
        message: 'Cooking timer paused at step 3.',
        screen: '/cook/abc',
        platform: 'ios',
        appVersion: '1.0.0-beta.4',
        buildNumber: '42',
        device: 'iPhone 15 Pro',
        nps: 9,
      });
    expect(res.status).toBe(201);
    expect(mockCreate.mock.calls[0][0].data).toMatchObject({
      message: 'Cooking timer paused at step 3.',
      screen: '/cook/abc',
      platform: 'ios',
      appVersion: '1.0.0-beta.4',
      buildNumber: '42',
      device: 'iPhone 15 Pro',
      nps: 9,
    });
  });

  it('rejects an empty message with 400 (no DB write)', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/feedback').send({ message: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/message/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a missing message with 400 (no DB write)', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/feedback').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('caps very long messages at 5000 chars with 400 (no DB write)', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'a'.repeat(5001) });
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects out-of-range nps with 400 (no DB write)', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'ok', nps: 42 });
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects invalid platform with 400 (no DB write)', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'ok', platform: 'palmos' });
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('is reachable without auth (testers may not be signed in)', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'no-auth feedback' });
    expect(res.status).toBe(201);
    expect(mockCreate.mock.calls[0][0].data.userId).toBeNull();
  });

  it('returns 500 with friendly error if Prisma throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('db down'));
    const app = makeApp();
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'will fail to save' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/feedback/i);
  });
});
