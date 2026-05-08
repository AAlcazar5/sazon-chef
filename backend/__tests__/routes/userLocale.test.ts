// ROADMAP 4.0 i18n-OPS4.1 — locale override endpoint tests.
//
// PATCH /api/user/locale lets a power user override the auto-detected locale.
// Validates that the body's locale is one we ship a coach persona for; unknown
// tags return 400 (no silent en fallback). Endpoint is auth-required.

const mockUserUpdate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { update: (...a: unknown[]) => mockUserUpdate(...a) },
  },
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

import express from 'express';
import request from 'supertest';
import { userLocaleRouter } from '../../src/modules/user/userLocaleRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user', userLocaleRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUserUpdate.mockImplementation(({ where, data }) =>
    Promise.resolve({ id: where.id, locale: data.locale }),
  );
});

describe('PATCH /api/user/locale — accepted tags', () => {
  it.each([
    ['en'],
    ['es'],
    ['es-MX'],
    ['es-AR'],
    ['es-CO'],
    ['es-ES'],
    ['pt'],
    ['pt-BR'],
    ['pt-PT'],
    ['fr'],
    ['fr-CA'],
  ])('persists %s and returns the new locale', async (locale) => {
    const app = makeApp();
    const res = await request(app)
      .patch('/api/user/locale')
      .set('x-user-id', 'user-1')
      .send({ locale });

    expect(res.status).toBe(200);
    expect(res.body.locale).toBe(locale);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { locale },
      select: { id: true, locale: true },
    });
  });
});

describe('PATCH /api/user/locale — validation', () => {
  it('returns 400 for an unknown locale tag', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/api/user/locale')
      .set('x-user-id', 'user-1')
      .send({ locale: 'jp-JP' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported|invalid|locale/i);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 for spurious French regional tags (e.g. fr-XX) — no silent fr fallback', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/api/user/locale')
      .set('x-user-id', 'user-1')
      .send({ locale: 'fr-XX' });

    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when locale field is missing', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/api/user/locale')
      .set('x-user-id', 'user-1')
      .send({});

    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when locale is null (cannot clear via this endpoint)', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/api/user/locale')
      .set('x-user-id', 'user-1')
      .send({ locale: null });

    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when locale is not a string', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/api/user/locale')
      .set('x-user-id', 'user-1')
      .send({ locale: 42 });

    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});
