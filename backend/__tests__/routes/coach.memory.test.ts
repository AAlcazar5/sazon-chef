// Group 10Y Phase 6: Coach memory CRUD route tests — Pro-gated, cross-user
// isolation, ownership enforcement.

const mockUserFindUnique = jest.fn();
const mockMemoryFindMany = jest.fn();
const mockMemoryFindFirst = jest.fn();
const mockMemoryUpdate = jest.fn();
const mockMemoryDelete = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    coachMemory: {
      findMany: (...a: unknown[]) => mockMemoryFindMany(...a),
      findFirst: (...a: unknown[]) => mockMemoryFindFirst(...a),
      update: (...a: unknown[]) => mockMemoryUpdate(...a),
      delete: (...a: unknown[]) => mockMemoryDelete(...a),
    },
  },
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

import express, { type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import { coachMemoryRoutes } from '../../src/modules/coach/coachMemoryRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const userId = (req.headers['x-user-id'] as string) || 'user-1';
    (req as unknown as { user: { id: string; email: string } }).user = {
      id: userId,
      email: `${userId}@test.com`,
    };
    next();
  });
  app.use('/api/coach/memories', coachMemoryRoutes);
  return app;
}

const FREE_USER = { id: 'user-free', subscriptionTier: 'free', subscriptionStatus: 'free' };
const PRO_USER = { id: 'user-pro', subscriptionTier: 'premium', subscriptionStatus: 'active' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/coach/memories', () => {
  it('returns 403 PRO_FEATURE for free users', async () => {
    mockUserFindUnique.mockResolvedValue(FREE_USER);
    const res = await request(makeApp())
      .get('/api/coach/memories')
      .set('x-user-id', 'user-free');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PRO_FEATURE');
    expect(res.body.feature).toBe('memory');
  });

  it('returns the requesting user own memories for Pro', async () => {
    mockUserFindUnique.mockResolvedValue(PRO_USER);
    mockMemoryFindMany.mockResolvedValue([
      { id: 'm1', userId: 'user-pro', kind: 'preference', content: 'spicy', confidence: 0.8, createdAt: new Date(), updatedAt: new Date() },
    ]);
    const res = await request(makeApp())
      .get('/api/coach/memories')
      .set('x-user-id', 'user-pro');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockMemoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-pro' }) }),
    );
  });
});

describe('PATCH /api/coach/memories/:id', () => {
  it('returns 403 for free users', async () => {
    mockUserFindUnique.mockResolvedValue(FREE_USER);
    const res = await request(makeApp())
      .patch('/api/coach/memories/m1')
      .set('x-user-id', 'user-free')
      .send({ content: 'new' });
    expect(res.status).toBe(403);
  });

  it('updates a memory owned by the user', async () => {
    mockUserFindUnique.mockResolvedValue(PRO_USER);
    mockMemoryFindFirst.mockResolvedValue({
      id: 'm1',
      userId: 'user-pro',
      kind: 'preference',
      content: 'spicy',
      confidence: 0.8,
    });
    mockMemoryUpdate.mockResolvedValue({
      id: 'm1',
      userId: 'user-pro',
      kind: 'preference',
      content: 'extra spicy',
      confidence: 0.9,
    });
    const res = await request(makeApp())
      .patch('/api/coach/memories/m1')
      .set('x-user-id', 'user-pro')
      .send({ content: 'extra spicy', confidence: 0.9 });
    expect(res.status).toBe(200);
    expect(mockMemoryUpdate).toHaveBeenCalled();
  });

  it('returns 404 when the memory belongs to another user', async () => {
    mockUserFindUnique.mockResolvedValue(PRO_USER);
    mockMemoryFindFirst.mockResolvedValue(null);
    const res = await request(makeApp())
      .patch('/api/coach/memories/m1')
      .set('x-user-id', 'user-pro')
      .send({ content: 'x' });
    expect(res.status).toBe(404);
    expect(mockMemoryUpdate).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/coach/memories/:id', () => {
  it('returns 403 for free users', async () => {
    mockUserFindUnique.mockResolvedValue(FREE_USER);
    const res = await request(makeApp())
      .delete('/api/coach/memories/m1')
      .set('x-user-id', 'user-free');
    expect(res.status).toBe(403);
  });

  it('deletes when owned by the user', async () => {
    mockUserFindUnique.mockResolvedValue(PRO_USER);
    mockMemoryFindFirst.mockResolvedValue({ id: 'm1', userId: 'user-pro' });
    mockMemoryDelete.mockResolvedValue({ id: 'm1' });
    const res = await request(makeApp())
      .delete('/api/coach/memories/m1')
      .set('x-user-id', 'user-pro');
    expect(res.status).toBe(204);
    expect(mockMemoryDelete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  it('returns 404 when not owned by the user', async () => {
    mockUserFindUnique.mockResolvedValue(PRO_USER);
    mockMemoryFindFirst.mockResolvedValue(null);
    const res = await request(makeApp())
      .delete('/api/coach/memories/m1')
      .set('x-user-id', 'user-pro');
    expect(res.status).toBe(404);
    expect(mockMemoryDelete).not.toHaveBeenCalled();
  });
});
