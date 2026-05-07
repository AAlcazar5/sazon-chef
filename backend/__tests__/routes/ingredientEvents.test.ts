// ROADMAP 4.0 IG6.1 — POST /api/ingredient-events/swap test.

import request from 'supertest';
import express from 'express';
import ingredientEventsRoutes from '../../src/modules/ingredientEvents/ingredientEventsRoutes';
import * as service from '../../src/services/ingredientEventService';

jest.mock('../../src/services/ingredientEventService');

function makeApp(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = userId;
    req.user = { id: userId };
    next();
  });
  app.use('/api/ingredient-events', ingredientEventsRoutes);
  return app;
}

describe('POST /api/ingredient-events/swap (IG6.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (service.recordMany as jest.Mock).mockResolvedValue(2);
  });

  it('400 when originalName is missing', async () => {
    const res = await request(makeApp('u1'))
      .post('/api/ingredient-events/swap')
      .send({ swapTargetName: 'lentils' });
    expect(res.status).toBe(400);
  });

  it('400 when swapTargetName is missing', async () => {
    const res = await request(makeApp('u1'))
      .post('/api/ingredient-events/swap')
      .send({ originalName: 'chickpeas' });
    expect(res.status).toBe(400);
  });

  it('400 when names match (case-insensitive)', async () => {
    const res = await request(makeApp('u1'))
      .post('/api/ingredient-events/swap')
      .send({ originalName: 'Cilantro', swapTargetName: 'cilantro' });
    expect(res.status).toBe(400);
  });

  it('400 when names are too long', async () => {
    const longName = 'x'.repeat(200);
    const res = await request(makeApp('u1'))
      .post('/api/ingredient-events/swap')
      .send({ originalName: longName, swapTargetName: 'lentils' });
    expect(res.status).toBe(400);
  });

  it('400 when recipeId is malformed', async () => {
    const res = await request(makeApp('u1'))
      .post('/api/ingredient-events/swap')
      .send({
        originalName: 'chickpeas',
        swapTargetName: 'lentils',
        recipeId: 12345 as any,
      });
    expect(res.status).toBe(400);
  });

  it('200 + persists both swappedOut and swappedIn rows in ONE batch', async () => {
    const res = await request(makeApp('u1'))
      .post('/api/ingredient-events/swap')
      .send({
        originalName: 'chickpeas',
        swapTargetName: 'lentils',
        recipeId: 'r-7',
      });
    expect(res.status).toBe(200);
    expect(res.body.persisted).toBe(2);
    // The route MUST call recordMany exactly once — both rows in one call.
    expect((service.recordMany as jest.Mock)).toHaveBeenCalledTimes(1);
    const batch = (service.recordMany as jest.Mock).mock.calls[0][0];
    expect(batch).toHaveLength(2);
    expect(batch[0]).toMatchObject({
      userId: 'u1',
      ingredientName: 'chickpeas',
      eventType: 'swappedOut',
      swapTargetName: 'lentils',
      recipeId: 'r-7',
    });
    expect(batch[1]).toMatchObject({
      userId: 'u1',
      ingredientName: 'lentils',
      eventType: 'swappedIn',
      swapTargetName: 'chickpeas',
      recipeId: 'r-7',
    });
  });

  it('500 on service error', async () => {
    (service.recordMany as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const res = await request(makeApp('u1'))
      .post('/api/ingredient-events/swap')
      .send({
        originalName: 'chickpeas',
        swapTargetName: 'lentils',
      });
    expect(res.status).toBe(500);
  });

  it('per-user scoping: userId comes from auth middleware', async () => {
    await request(makeApp('user-A'))
      .post('/api/ingredient-events/swap')
      .send({ originalName: 'chickpeas', swapTargetName: 'lentils' });
    const batch = (service.recordMany as jest.Mock).mock.calls[0][0];
    expect(batch.every((r: any) => r.userId === 'user-A')).toBe(true);
  });
});
