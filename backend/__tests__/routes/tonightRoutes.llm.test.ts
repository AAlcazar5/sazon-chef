// ROADMAP 4.0 TB2.2 — /api/tonight/proposal route test.

import request from 'supertest';
import express from 'express';
import { tonightRoutes } from '../../src/modules/tonight/tonightRoutes';
import * as adapter from '../../src/services/recommender/homeFeedRetrievalAdapter';
import * as ranker from '../../src/services/recommender/recommenderService';
import * as rate from '../../src/services/recommender/recommenderRateLimitService';
import { prisma } from '../../src/lib/prisma';

jest.mock('../../src/services/recommender/homeFeedRetrievalAdapter');
jest.mock('../../src/services/recommender/recommenderService');

function makeApp(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = userId;
    req.user = { id: userId };
    next();
  });
  app.use('/api/tonight', tonightRoutes);
  return app;
}

describe('POST /api/tonight/proposal (TB2.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rate.__testHooks.reset();
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'r1',
        title: 'Carbonara',
        cuisine: 'italian',
        cookTime: 25,
      },
    ]);
    (prisma.userPreferences.findFirst as jest.Mock).mockResolvedValue({
      dietaryRestrictions: [],
      bannedIngredients: [],
    });
    ((prisma as any).cookingLog ?? {}).count?.mockReset?.();
  });

  it('200 with picked recipe when ranker confidence ≥ threshold', async () => {
    (adapter.resolveRetrievalCandidates as jest.Mock).mockResolvedValue({
      recipeIds: ['r1'],
      scores: [0.9],
    });
    (ranker.rankWithLLM as jest.Mock).mockResolvedValue({
      recipeId: 'r1',
      confidence: 0.85,
      reason: 'Wednesday-night Italian — your most-cooked groove',
      runnerUpIds: [],
      source: 'llm',
    });
    const res = await request(makeApp('u1'))
      .post('/api/tonight/proposal')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.recipeId).toBe('r1');
    expect(res.body.confidence).toBeCloseTo(0.85, 2);
    expect(res.body.reason).toMatch(/Italian/);
  });

  it('503 low_confidence when ranker returns null', async () => {
    (adapter.resolveRetrievalCandidates as jest.Mock).mockResolvedValue({
      recipeIds: ['r1'],
      scores: [0.4],
    });
    (ranker.rankWithLLM as jest.Mock).mockResolvedValue(null);
    const res = await request(makeApp('u1'))
      .post('/api/tonight/proposal')
      .send({});
    expect(res.status).toBe(503);
    expect(res.body.reason).toBe('low_confidence');
  });

  it('503 ranker_unavailable when retrieval succeeds but ranker throws', async () => {
    (adapter.resolveRetrievalCandidates as jest.Mock).mockResolvedValue({
      recipeIds: ['r1'],
      scores: [0.9],
    });
    (ranker.rankWithLLM as jest.Mock).mockRejectedValue(new Error('boom'));
    const res = await request(makeApp('u1'))
      .post('/api/tonight/proposal')
      .send({});
    expect(res.status).toBe(503);
    expect(res.body.reason).toBe('ranker_unavailable');
  });

  it('503 cold_start when retrieval returns null', async () => {
    (adapter.resolveRetrievalCandidates as jest.Mock).mockResolvedValue(null);
    const res = await request(makeApp('u1'))
      .post('/api/tonight/proposal')
      .send({});
    expect(res.status).toBe(503);
    expect(res.body.reason).toBe('cold_start');
  });

  it('falls back to retrieval pick when daily budget exceeded', async () => {
    (adapter.resolveRetrievalCandidates as jest.Mock).mockResolvedValue({
      recipeIds: ['r1'],
      scores: [0.9],
    });
    (ranker.rankWithLLM as jest.Mock).mockResolvedValue({
      recipeId: 'r1',
      confidence: 0.9,
      reason: 'top pick',
      runnerUpIds: [],
      source: 'llm',
    });
    process.env.RECOMMENDER_DAILY_BUDGET = '1';
    const app = makeApp('u-budget');
    await request(app).post('/api/tonight/proposal').send({});
    const second = await request(app).post('/api/tonight/proposal').send({});
    expect(second.status).toBe(200);
    expect(second.body.source).toBe('retrieval_fallback');
    expect(second.body.recipeId).toBe('r1');
    delete process.env.RECOMMENDER_DAILY_BUDGET;
  });
});
