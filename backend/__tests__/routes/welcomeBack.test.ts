// ROADMAP 4.0 A7.4 — GET /api/auth/welcome-back test.
//
// tests/setup.ts globally mocks `@modules/auth/authRoutes` to a stub Router.
// Unmock it for this file so we exercise the real route.
jest.unmock('@modules/auth/authRoutes');

import request from 'supertest';
import express from 'express';
import { authRoutes } from '../../src/modules/auth/authRoutes';
import * as service from '../../src/services/welcomeBackService';

jest.mock('../../src/services/welcomeBackService');

// authMiddleware reads `Authorization: Bearer <jwt>`. For the unit tests
// here, we shortcut by mocking the middleware to attach a fake user.
jest.mock('../../src/modules/auth/authMiddleware', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.userId = req.headers['x-test-user-id'] || 'u-test';
    req.user = { id: req.userId };
    next();
  },
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
}

describe('GET /api/auth/welcome-back (A7.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 with peak: null when service returns null', async () => {
    (service.pickWelcomeBackPeak as jest.Mock).mockResolvedValue(null);
    const res = await request(makeApp())
      .get('/api/auth/welcome-back')
      .set('x-test-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.peak).toBeNull();
  });

  it('200 with peak payload when service returns one', async () => {
    (service.pickWelcomeBackPeak as jest.Mock).mockResolvedValue({
      message: 'Welcome back. Your last cook was 4 days ago — fancy a Persian Friday?',
      cuisine: 'Persian',
      daysSinceLastCook: 4,
    });
    const res = await request(makeApp())
      .get('/api/auth/welcome-back')
      .set('x-test-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.peak.message).toContain('Welcome back');
    expect(res.body.peak.cuisine).toBe('Persian');
    expect(res.body.peak.daysSinceLastCook).toBe(4);
  });

  it('500 on service error', async () => {
    (service.pickWelcomeBackPeak as jest.Mock).mockRejectedValueOnce(
      new Error('boom'),
    );
    const res = await request(makeApp())
      .get('/api/auth/welcome-back')
      .set('x-test-user-id', 'u1');
    expect(res.status).toBe(500);
  });

  it('passes the authenticated userId to the service', async () => {
    (service.pickWelcomeBackPeak as jest.Mock).mockResolvedValue(null);
    await request(makeApp())
      .get('/api/auth/welcome-back')
      .set('x-test-user-id', 'user-A');
    expect(
      (service.pickWelcomeBackPeak as jest.Mock).mock.calls[0][0].userId,
    ).toBe('user-A');
  });
});
