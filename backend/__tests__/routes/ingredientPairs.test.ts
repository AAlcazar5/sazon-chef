// ROADMAP 4.0 IG2.2 — Ingredient pairs endpoint test.

import request from 'supertest';
import express from 'express';
import ingredientPairsRoutes from '../../src/modules/ingredientPairs/ingredientPairsRoutes';
import * as service from '../../src/services/ingredientCoOccurrenceService';

jest.mock('../../src/services/ingredientCoOccurrenceService');

function makeApp(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = userId;
    req.user = { id: userId };
    next();
  });
  app.use('/api/ingredients', ingredientPairsRoutes);
  return app;
}

describe('GET /api/ingredients/pairs (IG2.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (service.getPairs as jest.Mock).mockResolvedValue([]);
  });

  it('400 when `with` query parameter is missing', async () => {
    const res = await request(makeApp('u1')).get('/api/ingredients/pairs');
    expect(res.status).toBe(400);
  });

  it('200 with pairs[] for valid request', async () => {
    (service.getPairs as jest.Mock).mockResolvedValue([
      { ingredient: 'lime', coCount: 5, lastSeenAt: new Date() },
      { ingredient: 'avocado', coCount: 3, lastSeenAt: new Date() },
    ]);
    const res = await request(makeApp('u1')).get(
      '/api/ingredients/pairs?with=cilantro',
    );
    expect(res.status).toBe(200);
    expect(res.body.pairs).toHaveLength(2);
    expect(res.body.pairs[0].ingredient).toBe('lime');
  });

  it('normalizes the anchor name before delegating to the service', async () => {
    await request(makeApp('u1')).get(
      '/api/ingredients/pairs?with=%20Cilantro%20',
    );
    const args = (service.getPairs as jest.Mock).mock.calls[0][0];
    expect(args.withIngredient).toBe('cilantro');
    expect(args.userId).toBe('u1');
  });

  it('uses k=5 by default and caps at MAX_K=10', async () => {
    await request(makeApp('u1')).get('/api/ingredients/pairs?with=cilantro');
    expect((service.getPairs as jest.Mock).mock.calls[0][0].k).toBe(5);

    (service.getPairs as jest.Mock).mockClear();
    await request(makeApp('u1')).get(
      '/api/ingredients/pairs?with=cilantro&k=99',
    );
    expect((service.getPairs as jest.Mock).mock.calls[0][0].k).toBe(10);
  });

  it('respects custom k within bounds', async () => {
    await request(makeApp('u1')).get(
      '/api/ingredients/pairs?with=cilantro&k=3',
    );
    expect((service.getPairs as jest.Mock).mock.calls[0][0].k).toBe(3);
  });

  it('per-user scoping: scoping is delegated to the service via userId', async () => {
    await request(makeApp('user-A')).get(
      '/api/ingredients/pairs?with=cilantro',
    );
    expect((service.getPairs as jest.Mock).mock.calls[0][0].userId).toBe(
      'user-A',
    );
  });

  it('500 on service error', async () => {
    (service.getPairs as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const res = await request(makeApp('u1')).get(
      '/api/ingredients/pairs?with=cilantro',
    );
    expect(res.status).toBe(500);
  });

  it('falls back to k=5 on garbage k input', async () => {
    await request(makeApp('u1')).get(
      '/api/ingredients/pairs?with=cilantro&k=garbage',
    );
    expect((service.getPairs as jest.Mock).mock.calls[0][0].k).toBe(5);
  });
});
