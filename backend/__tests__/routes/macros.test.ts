// Build-a-Plate Phase 10 — POST /api/macros/estimate route.
// See plans/product.md#build-a-plate Phase 10 spec.

// Mock the estimation service so we don't actually call USDA / Anthropic.
const mockEstimateMacros = jest.fn();
jest.mock('@/services/macroEstimationService', () => ({
  estimateMacros: (...a: unknown[]) => mockEstimateMacros(...a),
}));

import request from 'supertest';
import express from 'express';

// authMiddleware shortcut — same pattern as welcomeBack.test.ts.
// Skip the mock entirely on tests that need the real middleware (the auth-required test).
let authShouldPass = true;
jest.mock('../../src/modules/auth/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    if (!authShouldPass) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    req.userId = req.headers['x-test-user-id'] || 'u-test';
    req.user = { id: req.userId };
    next();
  },
  optionalAuth: (req: any, _res: any, next: any) => {
    req.userId = req.headers['x-test-user-id'];
    req.user = req.userId ? { id: req.userId } : undefined;
    next();
  },
}));

import { macrosRoutes } from '../../src/modules/macros/macrosRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/macros', macrosRoutes);
  return app;
}

const validBody = {
  name: 'Hass avocado',
  portionGrams: 200,
  slot: 'vegetable',
};

const happyResult = {
  caloriesPerPortion: 320,
  proteinG: 4,
  carbsG: 17,
  fatG: 29,
  fiberG: 13,
  source: 'usda',
  confidence: 'high',
  matchedName: 'Avocado, raw',
};

beforeEach(() => {
  jest.clearAllMocks();
  authShouldPass = true;
  mockEstimateMacros.mockResolvedValue(happyResult);
});

describe('POST /api/macros/estimate', () => {
  it('401s without auth', async () => {
    authShouldPass = false;
    const res = await request(makeApp()).post('/api/macros/estimate').send(validBody);
    expect(res.status).toBe(401);
    expect(mockEstimateMacros).not.toHaveBeenCalled();
  });

  it('happy path returns the full estimate shape', async () => {
    const res = await request(makeApp())
      .post('/api/macros/estimate')
      .set('x-test-user-id', 'u1')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(happyResult);
    expect(mockEstimateMacros).toHaveBeenCalledWith({
      name: 'Hass avocado',
      portionGrams: 200,
      slot: 'vegetable',
    });
  });

  it('400s when name is missing', async () => {
    const res = await request(makeApp())
      .post('/api/macros/estimate')
      .set('x-test-user-id', 'u1')
      .send({ portionGrams: 100, slot: 'protein' });
    expect(res.status).toBe(400);
    expect(mockEstimateMacros).not.toHaveBeenCalled();
  });

  it('400s when name is empty string', async () => {
    const res = await request(makeApp())
      .post('/api/macros/estimate')
      .set('x-test-user-id', 'u1')
      .send({ name: '', portionGrams: 100, slot: 'protein' });
    expect(res.status).toBe(400);
    expect(mockEstimateMacros).not.toHaveBeenCalled();
  });

  it('400s when portionGrams is zero or negative', async () => {
    const res = await request(makeApp())
      .post('/api/macros/estimate')
      .set('x-test-user-id', 'u1')
      .send({ name: 'salmon', portionGrams: 0, slot: 'protein' });
    expect(res.status).toBe(400);
    expect(mockEstimateMacros).not.toHaveBeenCalled();
  });

  it('400s when slot is not a valid MealComponentSlot', async () => {
    const res = await request(makeApp())
      .post('/api/macros/estimate')
      .set('x-test-user-id', 'u1')
      .send({ name: 'salmon', portionGrams: 100, slot: 'dessert' });
    expect(res.status).toBe(400);
    expect(mockEstimateMacros).not.toHaveBeenCalled();
  });

  it('caps absurdly large names to prevent abuse', async () => {
    const giant = 'a'.repeat(500);
    const res = await request(makeApp())
      .post('/api/macros/estimate')
      .set('x-test-user-id', 'u1')
      .send({ name: giant, portionGrams: 100, slot: 'protein' });
    expect(res.status).toBe(400);
    expect(mockEstimateMacros).not.toHaveBeenCalled();
  });

  it('caps portionGrams to a sane upper bound', async () => {
    const res = await request(makeApp())
      .post('/api/macros/estimate')
      .set('x-test-user-id', 'u1')
      .send({ name: 'salmon', portionGrams: 100000, slot: 'protein' });
    expect(res.status).toBe(400);
    expect(mockEstimateMacros).not.toHaveBeenCalled();
  });

  it('500s when the estimation service throws', async () => {
    mockEstimateMacros.mockRejectedValueOnce(new Error('service down'));
    const res = await request(makeApp())
      .post('/api/macros/estimate')
      .set('x-test-user-id', 'u1')
      .send(validBody);
    expect(res.status).toBe(500);
  });

  it('returns the fallback shape when estimation cannot resolve macros', async () => {
    mockEstimateMacros.mockResolvedValueOnce({
      caloriesPerPortion: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      source: 'fallback',
      confidence: 'unknown',
    });
    const res = await request(makeApp())
      .post('/api/macros/estimate')
      .set('x-test-user-id', 'u1')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('fallback');
    expect(res.body.confidence).toBe('unknown');
    expect(res.body.caloriesPerPortion).toBe(0);
  });
});
