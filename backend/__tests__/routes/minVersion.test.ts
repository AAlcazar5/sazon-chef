// U3 — Force-upgrade gate.
//
// `GET /api/app/min-version` returns the current minimum supported version
// per platform. Stored in env (not DB) so the gate works even if the DB is
// down. Frontend `useForceUpgrade` hook reads it on app-open and blocks
// users on stale builds.

import request from 'supertest';
import express from 'express';
import { minVersionRoutes } from '../../src/modules/minVersion/minVersionRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/app', minVersionRoutes);
  return app;
}

describe('U3: GET /api/app/min-version', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns a per-platform floor with sensible defaults when env unset', async () => {
    delete process.env.MIN_APP_VERSION_IOS;
    delete process.env.MIN_APP_VERSION_ANDROID;
    const app = makeApp();
    const res = await request(app).get('/api/app/min-version');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      ios: expect.stringMatching(/^\d+\.\d+\.\d+$/),
      android: expect.stringMatching(/^\d+\.\d+\.\d+$/),
    });
  });

  it('honors env overrides for both platforms', async () => {
    process.env.MIN_APP_VERSION_IOS = '1.2.3';
    process.env.MIN_APP_VERSION_ANDROID = '1.4.0';
    const app = makeApp();
    const res = await request(app).get('/api/app/min-version');
    expect(res.status).toBe(200);
    expect(res.body.data.ios).toBe('1.2.3');
    expect(res.body.data.android).toBe('1.4.0');
  });

  it('rejects invalid env values and falls back to default', async () => {
    process.env.MIN_APP_VERSION_IOS = 'not-a-version';
    process.env.MIN_APP_VERSION_ANDROID = '1.5.0';
    const app = makeApp();
    const res = await request(app).get('/api/app/min-version');
    expect(res.status).toBe(200);
    expect(res.body.data.ios).toMatch(/^\d+\.\d+\.\d+$/);
    expect(res.body.data.android).toBe('1.5.0');
  });

  it('is reachable without auth (must work even if DB / auth is down)', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/app/min-version');
    expect(res.status).toBe(200);
  });
});
