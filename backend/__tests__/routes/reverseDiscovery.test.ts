// I2.4 — GET /api/today/reverse-discovery route test.
import request from 'supertest';
import express from 'express';
import todayRoutes from '../../src/modules/today/todayRoutes';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    cookingLog: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = (req.headers['x-test-user-id'] as string) || 'u-test';
    req.user = { id: req.userId };
    next();
  });
  app.use('/api/today', todayRoutes);
  return app;
}

describe('GET /api/today/reverse-discovery (I2.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma as any).cookingLog.findMany.mockResolvedValue([]);
  });

  it('returns { candidate: null, copy: null } for en-US users (no value to add)', async () => {
    (prisma as any).user.findUnique.mockResolvedValue({ locale: 'en-US' });
    const res = await request(makeApp())
      .get('/api/today/reverse-discovery')
      .set('x-test-user-id', 'u-test');
    expect(res.status).toBe(200);
    expect(res.body.candidate).toBeNull();
    expect(res.body.copy).toBeNull();
  });

  it('returns a candidate + copy for a pt-BR user with no cooks', async () => {
    (prisma as any).user.findUnique.mockResolvedValue({ locale: 'pt-BR' });
    const res = await request(makeApp())
      .get('/api/today/reverse-discovery')
      .set('x-test-user-id', 'u-test');
    expect(res.status).toBe(200);
    expect(res.body.candidate).not.toBeNull();
    expect(res.body.candidate.locale).toBe('pt-BR');
    expect(res.body.candidate.availabilityTier).toBe('common');
    expect(res.body.copy.eyebrow).toMatch(/YOUR MARKET HAS/i);
    expect(res.body.copy.headline).toBe(res.body.candidate.localName);
  });

  it('candidate is excluded when the user has already cooked it', async () => {
    (prisma as any).user.findUnique.mockResolvedValue({ locale: 'pt-BR' });
    // First call — see what the user would otherwise be offered
    const baseline = await request(makeApp())
      .get('/api/today/reverse-discovery')
      .set('x-test-user-id', 'u-cooked-everything');
    const offered = baseline.body.candidate?.canonical;
    expect(offered).toBeDefined();

    // Now mock that the user has cooked it
    (prisma as any).cookingLog.findMany.mockResolvedValue([
      { recipe: { ingredients: [{ text: `1 cup ${offered}` }] } },
    ]);
    const res = await request(makeApp())
      .get('/api/today/reverse-discovery')
      .set('x-test-user-id', 'u-cooked-everything');
    expect(res.status).toBe(200);
    expect(res.body.candidate?.canonical).not.toBe(offered);
  });

  it('returns null when the user is in an unsupported locale', async () => {
    (prisma as any).user.findUnique.mockResolvedValue({ locale: 'jp-JP' });
    const res = await request(makeApp())
      .get('/api/today/reverse-discovery')
      .set('x-test-user-id', 'u-test');
    expect(res.status).toBe(200);
    expect(res.body.candidate).toBeNull();
  });

  it('treats null user.locale as en-US (no surface)', async () => {
    (prisma as any).user.findUnique.mockResolvedValue({ locale: null });
    const res = await request(makeApp())
      .get('/api/today/reverse-discovery')
      .set('x-test-user-id', 'u-test');
    expect(res.status).toBe(200);
    expect(res.body.candidate).toBeNull();
  });

  it('500 on prisma error', async () => {
    (prisma as any).user.findUnique.mockRejectedValue(new Error('boom'));
    const res = await request(makeApp())
      .get('/api/today/reverse-discovery')
      .set('x-test-user-id', 'u-test');
    expect(res.status).toBe(500);
  });
});
