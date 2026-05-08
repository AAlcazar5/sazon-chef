// ROADMAP 4.0 G1.2 — coach-locale override endpoint tests.
//
// PATCH /api/user/coach-locale lets a bilingual user set Sazon's voice
// independent of UI locale. Accepts the same supported-locale set as
// /api/user/locale plus null (clears the override).

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
import { userCoachLocaleRouter } from '../../src/modules/user/userCoachLocaleRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user', userCoachLocaleRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUserUpdate.mockImplementation(({ where, data }) =>
    Promise.resolve({ id: where.id, coachLocale: data.coachLocale }),
  );
});

describe('PATCH /api/user/coach-locale — accepted tags', () => {
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
  ])('persists %s and returns the new coachLocale', async (coachLocale) => {
    const app = makeApp();
    const res = await request(app)
      .patch('/api/user/coach-locale')
      .set('x-user-id', 'user-1')
      .send({ coachLocale });

    expect(res.status).toBe(200);
    expect(res.body.coachLocale).toBe(coachLocale);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { coachLocale },
      select: { id: true, coachLocale: true },
    });
  });
});

describe('PATCH /api/user/coach-locale — clear override', () => {
  it('accepts coachLocale: null to clear the override (inherits from User.locale)', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/api/user/coach-locale')
      .set('x-user-id', 'user-1')
      .send({ coachLocale: null });

    expect(res.status).toBe(200);
    expect(res.body.coachLocale).toBeNull();
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { coachLocale: null },
      select: { id: true, coachLocale: true },
    });
  });
});

describe('PATCH /api/user/coach-locale — validation', () => {
  it('returns 400 for an unknown locale tag', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/api/user/coach-locale')
      .set('x-user-id', 'user-1')
      .send({ coachLocale: 'jp-JP' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported|invalid|locale/i);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when coachLocale field is missing entirely (must be explicit string|null)', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/api/user/coach-locale')
      .set('x-user-id', 'user-1')
      .send({});

    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when coachLocale is a non-string non-null value', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/api/user/coach-locale')
      .set('x-user-id', 'user-1')
      .send({ coachLocale: 42 });

    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});
