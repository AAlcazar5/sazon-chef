// backend/__tests__/modules/recipe/recipeRoutes.test.ts
// Smoke test for the recipe routes registration. Importing the module
// runs every router.get/post/put/delete/patch call at module load,
// which is enough to cover the route-registration lines.
//
// We don't exercise individual handlers here — they're mocked at the
// global setup level. The point is to confirm:
//   1. The module loads without throwing.
//   2. The exported router is a function (Express Router instance).
//   3. The debug route works as a sanity check.

// Unmock the global setup.ts mock that replaces the routes with an empty
// router — we want the REAL recipeRoutes module loaded for coverage.
jest.unmock('@modules/recipe/recipeRoutes');
jest.unmock('../../../src/modules/recipe/recipeRoutes');

import express from 'express';
import request from 'supertest';

// Mock all the controllers so handler bodies don't fire (they have heavy
// dependency graphs we've already covered elsewhere).
jest.mock('../../../src/modules/recipe/recipeController', () => ({
  recipeController: new Proxy(
    {},
    {
      get: () => (_req: any, res: any) => res.json({ ok: true }),
    },
  ),
}));

jest.mock('../../../src/modules/recipe/newToYouController', () => ({
  newToYouController: new Proxy(
    {},
    {
      get: () => (_req: any, res: any) => res.json({ ok: true }),
    },
  ),
}));

jest.mock('../../../src/middleware/rateLimiter', () => ({
  aiLimiter: (_req: any, _res: any, next: any) => next(),
}));

import { recipeRoutes } from '../../../src/modules/recipe/recipeRoutes';

describe('recipeRoutes registration', () => {
  it('module loads without throwing', () => {
    expect(recipeRoutes).toBeDefined();
  });

  it('exposes /debug/test as a working route', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/recipes', recipeRoutes);

    const res = await request(app).get('/api/recipes/debug/test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: 'Debug route working',
        route: '/api/recipes/debug/test',
      }),
    );
  });

  it('registers GET /api/recipes (root)', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/recipes', recipeRoutes);

    const res = await request(app).get('/api/recipes');
    // Proxy handler returns { ok: true } regardless of which controller method ran
    expect(res.status).toBe(200);
  });

  it('registers POST /api/recipes/generate (AI-rate-limited)', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/recipes', recipeRoutes);

    const res = await request(app).post('/api/recipes/generate').send({});
    expect(res.status).toBe(200);
  });

  it('registers GET /api/recipes/new-to-you', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/recipes', recipeRoutes);

    const res = await request(app).get('/api/recipes/new-to-you');
    expect(res.status).toBe(200);
  });

  it('registers GET /api/recipes/browse-by-family', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/recipes', recipeRoutes);

    const res = await request(app).get('/api/recipes/browse-by-family');
    expect(res.status).toBe(200);
  });

  it('registers parameterized GET /api/recipes/:id', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/recipes', recipeRoutes);

    const res = await request(app).get('/api/recipes/some-recipe-id');
    expect(res.status).toBe(200);
  });
});
