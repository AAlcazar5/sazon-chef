// backend/__tests__/modules/recipe/recipeCollectionsController.test.ts
// Direct tests for the extracted collections controller — covers happy
// paths and error branches that the existing recipeController tests
// exercise transitively but weren't measuring against the new file.

import { Request, Response } from 'express';

jest.mock('../../../src/utils/authHelper', () => ({
  getUserId: jest.fn(() => 'u1'),
}));

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    collection: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    recipeCollection: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    savedRecipe: { findFirst: jest.fn() },
  },
}));

import { recipeCollectionsController } from '../../../src/modules/recipe/recipeCollectionsController';
import { prisma } from '../../../src/lib/prisma';

const p = prisma as any;

function buildRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function buildReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    body: {},
    query: {},
    headers: {},
    user: { id: 'u1', email: 'u1@example.com' },
    ...overrides,
  } as unknown as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCollections — happy + error', () => {
  it('returns shaped collections with recipeCount', async () => {
    p.collection.findMany.mockResolvedValueOnce([
      {
        id: 'c1',
        userId: 'u1',
        name: 'Faves',
        isPinned: false,
        sortOrder: 0,
        isDefault: false,
        _count: { recipeCollections: 3 },
      },
    ]);
    const req = buildReq();
    const res = buildRes();
    await recipeCollectionsController.getCollections(req, res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [expect.objectContaining({ id: 'c1', recipeCount: 3 })],
    });
  });

  it('handles missing _count gracefully (recipeCount=0)', async () => {
    p.collection.findMany.mockResolvedValueOnce([
      { id: 'c1', userId: 'u1', name: 'Empty', _count: undefined },
    ]);
    const req = buildReq();
    const res = buildRes();
    await recipeCollectionsController.getCollections(req, res);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data[0].recipeCount).toBe(0);
  });

  it('returns 500 on prisma error', async () => {
    p.collection.findMany.mockRejectedValueOnce(new Error('db down'));
    const req = buildReq();
    const res = buildRes();
    await recipeCollectionsController.getCollections(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('createCollection — happy + error branches', () => {
  it('returns 400 when name is missing', async () => {
    const req = buildReq({ body: {} });
    const res = buildRes();
    await recipeCollectionsController.createCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a new collection with all optional fields', async () => {
    p.collection.create.mockResolvedValueOnce({ id: 'c1', name: 'Faves' });
    const req = buildReq({
      body: {
        name: 'Faves',
        description: 'My favorites',
        coverImageUrl: 'http://img',
        category: 'comfort',
      },
    });
    const res = buildRes();
    await recipeCollectionsController.createCollection(req, res);
    expect(p.collection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        name: 'Faves',
        description: 'My favorites',
        coverImageUrl: 'http://img',
        category: 'comfort',
        isDefault: false,
      }),
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('handles P2002 unique-constraint as 409', async () => {
    const dup = Object.assign(new Error('dup'), { code: 'P2002' });
    p.collection.create.mockRejectedValueOnce(dup);
    const req = buildReq({ body: { name: 'Faves' } });
    const res = buildRes();
    await recipeCollectionsController.createCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('returns 500 on non-P2002 errors', async () => {
    p.collection.create.mockRejectedValueOnce(new Error('something else'));
    const req = buildReq({ body: { name: 'X' } });
    const res = buildRes();
    await recipeCollectionsController.createCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('updateCollection — partial fields + errors', () => {
  it('updates only provided fields (partial update)', async () => {
    p.collection.update.mockResolvedValueOnce({ id: 'c1', name: 'New' });
    const req = buildReq({
      params: { id: 'c1' },
      body: { name: 'New', isPinned: true },
    });
    const res = buildRes();
    await recipeCollectionsController.updateCollection(req, res);
    expect(p.collection.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { name: 'New', isPinned: true },
    });
  });

  it('handles description=null (explicit clear)', async () => {
    p.collection.update.mockResolvedValueOnce({ id: 'c1' });
    const req = buildReq({
      params: { id: 'c1' },
      body: { description: null, coverImageUrl: null, category: null },
    });
    const res = buildRes();
    await recipeCollectionsController.updateCollection(req, res);
    expect(p.collection.update.mock.calls[0][0].data).toEqual({
      description: null,
      coverImageUrl: null,
      category: null,
    });
  });

  it('returns 500 on prisma error', async () => {
    p.collection.update.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ params: { id: 'c1' }, body: { name: 'X' } });
    const res = buildRes();
    await recipeCollectionsController.updateCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('deleteCollection — happy + 404 + error', () => {
  it('returns 404 when collection does not exist', async () => {
    p.collection.findUnique.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'c1' } });
    const res = buildRes();
    await recipeCollectionsController.deleteCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(p.collection.delete).not.toHaveBeenCalled();
  });

  it('cascades recipeCollection deletions and deletes the collection', async () => {
    p.collection.findUnique.mockResolvedValueOnce({ id: 'c1' });
    p.recipeCollection.deleteMany.mockResolvedValueOnce({ count: 5 });
    p.collection.delete.mockResolvedValueOnce({ id: 'c1' });
    const req = buildReq({ params: { id: 'c1' } });
    const res = buildRes();
    await recipeCollectionsController.deleteCollection(req, res);
    expect(p.recipeCollection.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: 'c1' },
    });
    expect(p.collection.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('returns 500 on prisma error during cascade', async () => {
    p.collection.findUnique.mockResolvedValueOnce({ id: 'c1' });
    p.recipeCollection.deleteMany.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ params: { id: 'c1' } });
    const res = buildRes();
    await recipeCollectionsController.deleteCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('moveSavedRecipe — error path', () => {
  it('returns 500 on prisma error during deleteMany', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1' });
    p.recipeCollection.deleteMany.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({
      params: { id: 'r1' },
      body: { collectionIds: ['c1'] },
    });
    const res = buildRes();
    await recipeCollectionsController.moveSavedRecipe(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('rethrows non-P2002 errors during create', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1' });
    p.recipeCollection.deleteMany.mockResolvedValueOnce({ count: 0 });
    p.recipeCollection.create.mockRejectedValueOnce(new Error('different error'));
    const req = buildReq({
      params: { id: 'r1' },
      body: { collectionIds: ['c1'] },
    });
    const res = buildRes();
    await recipeCollectionsController.moveSavedRecipe(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('togglePinCollection — error path', () => {
  it('returns 500 on update error', async () => {
    p.collection.findFirst.mockResolvedValueOnce({ id: 'c1', isPinned: false });
    p.collection.update.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ params: { id: 'c1' } });
    const res = buildRes();
    await recipeCollectionsController.togglePinCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('reorderCollections — error path', () => {
  it('returns 500 on prisma error', async () => {
    p.collection.updateMany.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ body: { order: [{ id: 'c1', sortOrder: 0 }] } });
    const res = buildRes();
    await recipeCollectionsController.reorderCollections(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('duplicateCollection — happy without recipes + error', () => {
  it('duplicates with no recipe associations', async () => {
    p.collection.findFirst.mockResolvedValueOnce({
      id: 'c1',
      userId: 'u1',
      name: 'Original',
      description: null,
      coverImageUrl: null,
      recipeCollections: [],
    });
    p.collection.create.mockResolvedValueOnce({ id: 'c2', name: 'Original (Copy)' });
    const req = buildReq({ params: { id: 'c1' } });
    const res = buildRes();
    await recipeCollectionsController.duplicateCollection(req, res);
    expect(p.recipeCollection.createMany).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ recipeCount: 0 }),
      }),
    );
  });

  it('returns 500 on non-P2002 error', async () => {
    p.collection.findFirst.mockResolvedValueOnce({
      id: 'c1',
      userId: 'u1',
      name: 'Original',
      recipeCollections: [],
    });
    p.collection.create.mockRejectedValueOnce(new Error('something else'));
    const req = buildReq({ params: { id: 'c1' } });
    const res = buildRes();
    await recipeCollectionsController.duplicateCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('mergeCollections — error path + edge', () => {
  it('rethrows non-P2002 errors during merge create loop', async () => {
    p.collection.findMany.mockResolvedValueOnce([{ id: 's1' }, { id: 't1' }]);
    p.recipeCollection.findMany.mockResolvedValueOnce([{ savedRecipeId: 'sr1' }]);
    p.recipeCollection.create.mockRejectedValueOnce(new Error('not p2002'));
    const req = buildReq({ body: { sourceIds: ['s1'], targetId: 't1' } });
    const res = buildRes();
    await recipeCollectionsController.mergeCollections(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 500 when target lookup throws', async () => {
    p.collection.findMany.mockResolvedValueOnce([{ id: 's1' }, { id: 't1' }]);
    p.recipeCollection.findMany.mockResolvedValueOnce([]);
    p.recipeCollection.deleteMany.mockResolvedValueOnce({ count: 0 });
    p.collection.deleteMany.mockResolvedValueOnce({ count: 1 });
    p.collection.findUnique.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ body: { sourceIds: ['s1'], targetId: 't1' } });
    const res = buildRes();
    await recipeCollectionsController.mergeCollections(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
