// ROADMAP 4.0 IG4.3 — GET /api/pantry/expiring test.
//
// NOTE: tests/setup.ts globally mocks `@modules/pantry/pantryRoutes` to a
// stub Router. We unmock it here to test the real routes file.

jest.unmock('@modules/pantry/pantryRoutes');

import request from 'supertest';
import express from 'express';
import pantryRoutes from '../../src/modules/pantry/pantryRoutes';
import * as service from '../../src/services/pantryExpiryService';

jest.mock('../../src/services/pantryExpiryService');
jest.mock('../../src/services/sazonVoiceService', () => ({
  ...jest.requireActual('../../src/services/sazonVoiceService'),
}));

function makeApp(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = userId;
    req.user = { id: userId };
    next();
  });
  app.use('/api/pantry', pantryRoutes);
  return app;
}

describe('GET /api/pantry/expiring (IG4.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (service.getExpiringPantryItems as jest.Mock).mockResolvedValue([]);
  });

  it('200 with empty items[] when nothing is expiring', async () => {
    const res = await request(makeApp('u1')).get('/api/pantry/expiring');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('200 with items + lifestyle prose when expiring', async () => {
    (service.getExpiringPantryItems as jest.Mock).mockResolvedValue([
      {
        id: 'p1',
        name: 'cilantro',
        category: 'herbs',
        quantity: null,
        unit: null,
        daysUntilExpiry: 1,
        expiresAt: new Date(),
        expirySource: 'fallback',
      },
    ]);
    const res = await request(makeApp('u1')).get('/api/pantry/expiring');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].prompt).toContain('cilantro');
    // Lifestyle voice — no shame
    expect(res.body.items[0].prompt.toLowerCase()).not.toMatch(/expiring|waste|spoil/);
  });

  it('uses withinDays=3 default and caps at MAX_WITHIN_DAYS=14', async () => {
    await request(makeApp('u1')).get('/api/pantry/expiring');
    expect(
      (service.getExpiringPantryItems as jest.Mock).mock.calls[0][0].withinDays,
    ).toBe(3);

    (service.getExpiringPantryItems as jest.Mock).mockClear();
    await request(makeApp('u1')).get('/api/pantry/expiring?withinDays=999');
    expect(
      (service.getExpiringPantryItems as jest.Mock).mock.calls[0][0].withinDays,
    ).toBe(14);
  });

  it('respects custom withinDays within bounds', async () => {
    await request(makeApp('u1')).get('/api/pantry/expiring?withinDays=7');
    expect(
      (service.getExpiringPantryItems as jest.Mock).mock.calls[0][0].withinDays,
    ).toBe(7);
  });

  it('500 on service error', async () => {
    (service.getExpiringPantryItems as jest.Mock).mockRejectedValueOnce(
      new Error('db down'),
    );
    const res = await request(makeApp('u1')).get('/api/pantry/expiring');
    expect(res.status).toBe(500);
  });

  it('passes userId from auth middleware to the service', async () => {
    await request(makeApp('user-123')).get('/api/pantry/expiring');
    expect(
      (service.getExpiringPantryItems as jest.Mock).mock.calls[0][0].userId,
    ).toBe('user-123');
  });
});
