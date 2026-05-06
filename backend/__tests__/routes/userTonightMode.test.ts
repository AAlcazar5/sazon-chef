// ROADMAP 4.0 T0.1 — PUT /api/user/tonight-mode integration test.

import request from 'supertest';
import express from 'express';
import { tonightModeRouter } from '../../src/modules/user/userTonightModeRoutes';
import * as featureFlag from '../../src/services/featureFlagService';

jest.mock('../../src/services/featureFlagService');

function makeApp(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = userId;
    req.user = { id: userId };
    next();
  });
  app.use('/api/user', tonightModeRouter);
  return app;
}

describe('PUT /api/user/tonight-mode (T0.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('400 when `enabled` field is missing or non-boolean', async () => {
    const app = makeApp('user-1');
    const res = await request(app).put('/api/user/tonight-mode').send({});
    expect(res.status).toBe(400);
  });

  it('403 when env flag is off', async () => {
    (featureFlag.setUserTonightModeEnabled as jest.Mock).mockResolvedValue({
      ok: false,
      reason: 'flag_off',
    });
    const app = makeApp('user-1');
    const res = await request(app)
      .put('/api/user/tonight-mode')
      .send({ enabled: true });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('flag_off');
  });

  it('200 when env flag is on and pref persists', async () => {
    (featureFlag.setUserTonightModeEnabled as jest.Mock).mockResolvedValue({
      ok: true,
    });
    const app = makeApp('user-1');
    const res = await request(app)
      .put('/api/user/tonight-mode')
      .send({ enabled: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tonightModeEnabled: true });
    expect(featureFlag.setUserTonightModeEnabled).toHaveBeenCalledWith(
      'user-1',
      true
    );
  });

  it('writes `tonightModePromptedAt` when client signals nudge dismissed', async () => {
    (featureFlag.setUserTonightModeEnabled as jest.Mock).mockResolvedValue({
      ok: true,
    });
    (featureFlag.setUserTonightModePromptedAt as jest.Mock).mockResolvedValue(
      undefined
    );
    const app = makeApp('user-1');
    const res = await request(app)
      .put('/api/user/tonight-mode')
      .send({ enabled: false, dismissPrompt: true });
    expect(res.status).toBe(200);
    expect(featureFlag.setUserTonightModePromptedAt).toHaveBeenCalledWith(
      'user-1',
      expect.any(Date)
    );
  });
});
