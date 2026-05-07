// ROADMAP 4.0 N2.2 — GET /api/today/coverage test.

import request from 'supertest';
import express from 'express';
import todayRoutes from '../../src/modules/today/todayRoutes';
import * as ctx from '../../src/services/personalizationContext';

jest.mock('../../src/services/personalizationContext');

function makeApp(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = userId;
    req.user = { id: userId };
    next();
  });
  app.use('/api/today', todayRoutes);
  return app;
}

describe('GET /api/today/coverage (N2.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ctx.buildPersonalizationContext as jest.Mock).mockResolvedValue({
      userId: 'u1',
      recentCookCount: 0,
      lifetimeCookCount: 0,
      daysSinceSignup: 1,
      signalCoverage: 'cold',
      pantry: [],
      expiringItems: [],
      cuisineLean: [],
      preferences: {
        cookingSkillLevel: null,
        goalPhase: null,
        nutritionUIDensity: null,
        cookTimePreference: null,
      },
      asOf: new Date(),
    });
  });

  it('200 with cold tier for a fresh user', async () => {
    const res = await request(makeApp('u1')).get('/api/today/coverage');
    expect(res.status).toBe(200);
    expect(res.body.tier).toBe('cold');
    expect(res.body.recentCookCount).toBe(0);
    expect(res.body.daysSinceSignup).toBe(1);
  });

  it('200 with mid tier when the context says so', async () => {
    (ctx.buildPersonalizationContext as jest.Mock).mockResolvedValue({
      userId: 'u1',
      recentCookCount: 5,
      lifetimeCookCount: 10,
      daysSinceSignup: 14,
      signalCoverage: 'mid',
      pantry: [],
      expiringItems: [],
      cuisineLean: [],
      preferences: {
        cookingSkillLevel: 'home_cook',
        goalPhase: null,
        nutritionUIDensity: null,
        cookTimePreference: 30,
      },
      asOf: new Date(),
    });
    const res = await request(makeApp('u1')).get('/api/today/coverage');
    expect(res.status).toBe(200);
    expect(res.body.tier).toBe('mid');
    expect(res.body.recentCookCount).toBe(5);
  });

  it('200 with high tier for engaged users', async () => {
    (ctx.buildPersonalizationContext as jest.Mock).mockResolvedValue({
      userId: 'u1',
      recentCookCount: 20,
      lifetimeCookCount: 50,
      daysSinceSignup: 60,
      signalCoverage: 'high',
      pantry: ['rice'],
      expiringItems: [],
      cuisineLean: [{ cuisine: 'Italian', cookCount: 8 }],
      preferences: {
        cookingSkillLevel: 'confident',
        goalPhase: 'maintain',
        nutritionUIDensity: 'macros',
        cookTimePreference: 30,
      },
      asOf: new Date(),
    });
    const res = await request(makeApp('u1')).get('/api/today/coverage');
    expect(res.body.tier).toBe('high');
  });

  it('500 on service error', async () => {
    (ctx.buildPersonalizationContext as jest.Mock).mockRejectedValue(
      new Error('boom'),
    );
    const res = await request(makeApp('u1')).get('/api/today/coverage');
    expect(res.status).toBe(500);
  });

  it('passes userId from auth middleware to the service', async () => {
    await request(makeApp('user-A')).get('/api/today/coverage');
    expect(
      (ctx.buildPersonalizationContext as jest.Mock).mock.calls[0][0].userId,
    ).toBe('user-A');
  });
});
