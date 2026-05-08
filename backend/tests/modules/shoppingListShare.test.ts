// backend/tests/modules/shoppingListShare.test.ts
// TDD: Task 5 — shopping list share deep link

import request from 'supertest';
import express from 'express';

// Auth mock — must come before any module that imports authHelper
jest.mock('../../src/utils/authHelper', () => ({
  getUserId: (req: any) => req.headers['x-user-id'] || 'user-1',
}));

// We rely on the global prisma mock registered in setup.ts for '../src/lib/prisma'
// Access the mocked prisma via require after jest.mock hooks are set
const { prisma: mockPrisma } = require('../../src/lib/prisma');

// ─── App setup ────────────────────────────────────────────────────────────────
function makeApp() {
  const { shoppingListShareController } = require('../../src/modules/shoppingListShare/shoppingListShareController');
  const { Router } = require('express');
  const router = Router();
  router.get('/import/:token', shoppingListShareController.importShare);
  router.post('/:id/share', shoppingListShareController.createShare);

  const app = express();
  app.use(express.json());
  app.use('/api/shopping-lists', router);
  return app;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Dynamic — `IN_7_DAYS` must always be in the future relative to the
// machine clock at test time, otherwise the controller's expiresAt check
// flips the test's intended kind from 'max_uses' to 'expired'.
const NOW = new Date();
const IN_7_DAYS = new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000);

const makeList = (id = 'list-1', userId = 'user-1') => ({
  id,
  userId,
  name: 'Meal Plan Week',
  isActive: true,
  items: [],
});

const makeShare = (overrides: Record<string, any> = {}) => ({
  id: 'share-1',
  listId: 'list-1',
  token: 'abc123token',
  createdBy: 'user-1',
  expiresAt: IN_7_DAYS,
  usedBy: '[]',
  maxUses: 10,
  createdAt: NOW,
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('POST /api/shopping-lists/:id/share', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
  });

  it('returns 404 when the list does not belong to the user', async () => {
    mockPrisma.shoppingList.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/shopping-lists/list-1/share')
      .set('x-user-id', 'user-1')
      .send({});

    expect(res.status).toBe(404);
  });

  it('returns shareUrl, token, and expiresAt on success', async () => {
    mockPrisma.shoppingList.findFirst.mockResolvedValue(makeList());
    mockPrisma.shoppingListShare.create.mockResolvedValue(makeShare());

    const res = await request(app)
      .post('/api/shopping-lists/list-1/share')
      .set('x-user-id', 'user-1')
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.shareUrl).toMatch(/https:\/\/sazonchef\.app\/import\/shopping-list\//);
    expect(res.body.expiresAt).toBeDefined();
  });

  it('token is URL-safe (no +, /, =)', async () => {
    mockPrisma.shoppingList.findFirst.mockResolvedValue(makeList());
    mockPrisma.shoppingListShare.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...makeShare(), token: data.token })
    );

    const res = await request(app)
      .post('/api/shopping-lists/list-1/share')
      .set('x-user-id', 'user-1')
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('expiresAt is approximately 7 days from now', async () => {
    mockPrisma.shoppingList.findFirst.mockResolvedValue(makeList());
    mockPrisma.shoppingListShare.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...makeShare(), expiresAt: data.expiresAt })
    );

    const before = Date.now();
    const res = await request(app)
      .post('/api/shopping-lists/list-1/share')
      .set('x-user-id', 'user-1')
      .send({});
    const after = Date.now();

    expect(res.status).toBe(201);
    const expiresAt = new Date(res.body.expiresAt).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

describe('GET /api/shopping-lists/import/:token', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
  });

  it('returns 410 when token is expired', async () => {
    mockPrisma.shoppingListShare.findUnique.mockResolvedValue(
      makeShare({ expiresAt: new Date('2020-01-01') })
    );

    const res = await request(app)
      .get('/api/shopping-lists/import/abc123token')
      .set('x-user-id', 'user-2');

    expect(res.status).toBe(410);
  });

  it('returns 403 when maxUses exceeded (11th unique user)', async () => {
    // 10 unique users already in importedByMap
    const usedByEntries = Array.from({ length: 10 }, (_, i) => ({
      userId: `user-${i + 10}`,
      listId: `imported-list-${i}`,
    }));
    mockPrisma.shoppingListShare.findUnique.mockResolvedValue(
      makeShare({ usedBy: JSON.stringify(usedByEntries), maxUses: 10, expiresAt: IN_7_DAYS })
    );

    const res = await request(app)
      .get('/api/shopping-lists/import/abc123token')
      .set('x-user-id', 'user-new');

    expect(res.status).toBe(403);
  });

  it('returns 404 when token does not exist', async () => {
    mockPrisma.shoppingListShare.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/shopping-lists/import/nonexistent')
      .set('x-user-id', 'user-2');

    expect(res.status).toBe(404);
  });

  it('creates a new list with unpurchased items copied, adds user to usedBy', async () => {
    // Only unpurchased items returned by mock (controller filters with purchased: false in where clause)
    const unpurchasedItems = [
      { id: 'item-1', name: 'Chicken', quantity: '2 lbs', category: 'Meat & Seafood', notes: null, purchased: false, price: null },
    ];
    mockPrisma.shoppingListShare.findUnique.mockResolvedValue(
      makeShare({ expiresAt: IN_7_DAYS, usedBy: '[]' })
    );
    mockPrisma.shoppingList.findFirst.mockResolvedValue({ id: 'list-1', name: 'Meal Plan Week' });
    mockPrisma.shoppingListItem.findMany.mockResolvedValue(unpurchasedItems);
    const newList = { id: 'new-list-1', name: 'Meal Plan Week', userId: 'user-2', isActive: true };
    mockPrisma.shoppingList.create.mockResolvedValue(newList);
    mockPrisma.shoppingListItem.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.shoppingListShare.update.mockResolvedValue({});

    const res = await request(app)
      .get('/api/shopping-lists/import/abc123token')
      .set('x-user-id', 'user-2');

    expect(res.status).toBe(200);
    expect(res.body.listId).toBe('new-list-1');

    // Copied items are unpurchased
    expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Chicken', purchased: false }),
        ]),
      })
    );
    const createCall = mockPrisma.shoppingListItem.createMany.mock.calls[0][0];
    expect(createCall.data).toHaveLength(1);
  });

  it('is idempotent — returns same listId on second import by same user', async () => {
    // usedBy stores objects: [{userId, listId}]
    const usedByWithUser2 = JSON.stringify([{ userId: 'user-2', listId: 'existing-import-list' }]);
    mockPrisma.shoppingListShare.findUnique.mockResolvedValue(
      makeShare({ expiresAt: IN_7_DAYS, usedBy: usedByWithUser2 })
    );

    const res = await request(app)
      .get('/api/shopping-lists/import/abc123token')
      .set('x-user-id', 'user-2');

    expect(res.status).toBe(200);
    expect(res.body.listId).toBe('existing-import-list');
    // Should NOT create a new list or copy items
    expect(mockPrisma.shoppingList.create).not.toHaveBeenCalled();
    expect(mockPrisma.shoppingListItem.createMany).not.toHaveBeenCalled();
  });

  it('appends userId to usedBy on first import', async () => {
    const existingEntry = [{ userId: 'user-3', listId: 'some-list-id' }];
    mockPrisma.shoppingListShare.findUnique.mockResolvedValue(
      makeShare({ expiresAt: IN_7_DAYS, usedBy: JSON.stringify(existingEntry) })
    );
    mockPrisma.shoppingList.findFirst.mockResolvedValue({ id: 'list-1', name: 'Test List' });
    mockPrisma.shoppingListItem.findMany.mockResolvedValue([]);
    mockPrisma.shoppingList.create.mockResolvedValue({ id: 'new-list-2', name: 'Test List', userId: 'user-4', isActive: true });
    mockPrisma.shoppingListItem.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.shoppingListShare.update.mockResolvedValue({});

    await request(app)
      .get('/api/shopping-lists/import/abc123token')
      .set('x-user-id', 'user-4');

    expect(mockPrisma.shoppingListShare.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          usedBy: expect.stringContaining('user-4'),
        }),
      })
    );
  });
});
