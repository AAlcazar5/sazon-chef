// J13 — GET /api/recap/wrapped route test.
//
// Mounts the real route + mocks the prisma + service layers. Verifies:
//   - userId derived from auth middleware reaches the service
//   - year query param flows through (defaults to current year)
//   - 200 on success with the payload echoed
//   - 500 on service error
import request from 'supertest';
import express from 'express';
import { weeklyRecapRoutes } from '../../src/modules/recap/weeklyRecapRoutes';
import * as service from '../../src/services/yearlyRecapService';

jest.mock('../../src/services/yearlyRecapService', () => {
  const actual = jest.requireActual('../../src/services/yearlyRecapService');
  return {
    ...actual,
    buildYearlyWrapped: jest.fn(),
  };
});

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    cookingLog: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = (req.headers['x-test-user-id'] as string) || 'u-test';
    req.user = { id: req.userId };
    next();
  });
  app.use('/api/recap', weeklyRecapRoutes);
  return app;
}

const samplePayload = {
  userId: 'u-test',
  year: 2026,
  cookCount: 0,
  isSparse: true,
  slides: [
    { type: 'top_cuisines', title: 'Your first cuisines', primary: 'A blank map.' },
    { type: 'ingredients_tasted', title: 'Ingredients tasted', primary: '0 unique ingredients' },
    { type: 'longest_streak', title: 'Longest run', primary: 'A streak away.' },
    { type: 'micros', title: 'Micros highlights', primary: 'Discovery is the surface.' },
    { type: 'first_time', title: 'A new world', primary: 'A cuisine awaits.' },
  ],
};

describe('GET /api/recap/wrapped (J13)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 with the Wrapped payload', async () => {
    (service.buildYearlyWrapped as jest.Mock).mockReturnValue(samplePayload);
    const res = await request(makeApp())
      .get('/api/recap/wrapped')
      .set('x-test-user-id', 'u-test');
    expect(res.status).toBe(200);
    expect(res.body.slides).toHaveLength(5);
    expect(res.body.userId).toBe('u-test');
  });

  it('passes the authenticated userId to the service', async () => {
    (service.buildYearlyWrapped as jest.Mock).mockReturnValue(samplePayload);
    await request(makeApp())
      .get('/api/recap/wrapped')
      .set('x-test-user-id', 'user-A');
    const call = (service.buildYearlyWrapped as jest.Mock).mock.calls[0][0];
    expect(call.userId).toBe('user-A');
  });

  it('honors the ?year= query param', async () => {
    (service.buildYearlyWrapped as jest.Mock).mockReturnValue(samplePayload);
    await request(makeApp())
      .get('/api/recap/wrapped?year=2025')
      .set('x-test-user-id', 'u-test');
    const call = (service.buildYearlyWrapped as jest.Mock).mock.calls[0][0];
    expect(call.year).toBe(2025);
  });

  it('falls back to current year when ?year= is missing', async () => {
    (service.buildYearlyWrapped as jest.Mock).mockReturnValue(samplePayload);
    await request(makeApp())
      .get('/api/recap/wrapped')
      .set('x-test-user-id', 'u-test');
    const call = (service.buildYearlyWrapped as jest.Mock).mock.calls[0][0];
    expect(call.year).toBe(new Date().getUTCFullYear());
  });

  it('falls back to current year when ?year= is non-numeric or out of range', async () => {
    (service.buildYearlyWrapped as jest.Mock).mockReturnValue(samplePayload);
    for (const bad of ['abc', '1500', '3000']) {
      jest.clearAllMocks();
      (service.buildYearlyWrapped as jest.Mock).mockReturnValue(samplePayload);
      await request(makeApp())
        .get(`/api/recap/wrapped?year=${bad}`)
        .set('x-test-user-id', 'u-test');
      const call = (service.buildYearlyWrapped as jest.Mock).mock.calls[0][0];
      expect(call.year).toBe(new Date().getUTCFullYear());
    }
  });

  it('500 on service error', async () => {
    (service.buildYearlyWrapped as jest.Mock).mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await request(makeApp())
      .get('/api/recap/wrapped')
      .set('x-test-user-id', 'u-test');
    expect(res.status).toBe(500);
  });
});
