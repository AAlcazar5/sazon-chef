// P3 retention — cuisine-unlock auto-collection service.
//
// Mocks Prisma at the module boundary so the test asserts:
//   - idempotency via `Collection @@unique([userId, name])`
//   - the trigger only fires on the *first* cook of a cuisine
//   - excluded recipes (already cooked/saved) are not re-seeded
//   - seeded saves + collection joins are upserted (no duplicate writes)

const prismaMock = {
  collection: { findUnique: jest.fn(), create: jest.fn() },
  cookingLog: { findMany: jest.fn(), count: jest.fn() },
  savedRecipe: { findMany: jest.fn(), upsert: jest.fn() },
  recipeCollection: { upsert: jest.fn() },
  recipe: { findUnique: jest.fn(), findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import {
  ensureCuisineUnlockCollection,
  maybeFireCuisineUnlock,
} from '../../src/services/cuisineUnlockService';

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.savedRecipe.upsert.mockImplementation(async ({ where }: any) => ({
    id: `saved-${where.recipeId_userId.recipeId}`,
  }));
  prismaMock.recipeCollection.upsert.mockResolvedValue({ id: 'rc1' });
});

describe('ensureCuisineUnlockCollection', () => {
  it('creates the collection and seeds up to 5 candidate recipes', async () => {
    prismaMock.collection.findUnique.mockResolvedValue(null);
    prismaMock.collection.create.mockResolvedValue({ id: 'col1' });
    prismaMock.cookingLog.findMany.mockResolvedValue([{ recipeId: 'cooked-1' }]);
    prismaMock.savedRecipe.findMany.mockResolvedValue([]);
    prismaMock.recipe.findMany.mockResolvedValue([
      { id: 'r1' },
      { id: 'r2' },
      { id: 'r3' },
      { id: 'r4' },
      { id: 'r5' },
      { id: 'r6' },
    ]);

    const out = await ensureCuisineUnlockCollection('u1', 'Persian');

    expect(out).toMatchObject({
      collectionId: 'col1',
      recipesAdded: 5,
      alreadyExisted: false,
    });
    expect(prismaMock.collection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Welcome to Persian',
          userId: 'u1',
          category: 'cuisine',
        }),
      }),
    );
    expect(prismaMock.recipeCollection.upsert).toHaveBeenCalledTimes(5);
  });

  it('is idempotent — returns existing collection without re-seeding', async () => {
    prismaMock.collection.findUnique.mockResolvedValue({ id: 'col1' });

    const out = await ensureCuisineUnlockCollection('u1', 'Persian');

    expect(out).toMatchObject({
      collectionId: 'col1',
      recipesAdded: 0,
      alreadyExisted: true,
    });
    expect(prismaMock.collection.create).not.toHaveBeenCalled();
    expect(prismaMock.recipeCollection.upsert).not.toHaveBeenCalled();
  });

  it('returns null for an empty cuisine string', async () => {
    const out = await ensureCuisineUnlockCollection('u1', '   ');
    expect(out).toBeNull();
    expect(prismaMock.collection.findUnique).not.toHaveBeenCalled();
  });

  it('uses the candidate list minus cooked + saved exclusions', async () => {
    prismaMock.collection.findUnique.mockResolvedValue(null);
    prismaMock.collection.create.mockResolvedValue({ id: 'col1' });
    prismaMock.cookingLog.findMany.mockResolvedValue([{ recipeId: 'r-cooked' }]);
    prismaMock.savedRecipe.findMany.mockResolvedValue([{ recipeId: 'r-saved' }]);
    prismaMock.recipe.findMany.mockResolvedValue([{ id: 'r-new-1' }, { id: 'r-new-2' }]);

    await ensureCuisineUnlockCollection('u1', 'Persian');

    const recipeFindCall = prismaMock.recipe.findMany.mock.calls[0][0];
    const excluded = recipeFindCall.where.id.notIn as string[];
    expect(excluded).toEqual(expect.arrayContaining(['r-cooked', 'r-saved']));
  });

  it('title-cases the cuisine for the collection name', async () => {
    prismaMock.collection.findUnique.mockResolvedValue(null);
    prismaMock.collection.create.mockResolvedValue({ id: 'col1' });
    prismaMock.cookingLog.findMany.mockResolvedValue([]);
    prismaMock.savedRecipe.findMany.mockResolvedValue([]);
    prismaMock.recipe.findMany.mockResolvedValue([]);

    await ensureCuisineUnlockCollection('u1', 'persian');

    expect(prismaMock.collection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Welcome to Persian' }),
      }),
    );
  });
});

describe('maybeFireCuisineUnlock', () => {
  it('fires ensure when this is the first cook of the cuisine', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue({ cuisine: 'Persian' });
    prismaMock.cookingLog.count.mockResolvedValue(1); // just-inserted cook is the only one
    prismaMock.collection.findUnique.mockResolvedValue(null);
    prismaMock.collection.create.mockResolvedValue({ id: 'col1' });
    prismaMock.cookingLog.findMany.mockResolvedValue([]);
    prismaMock.savedRecipe.findMany.mockResolvedValue([]);
    prismaMock.recipe.findMany.mockResolvedValue([{ id: 'r1' }]);

    await maybeFireCuisineUnlock('u1', 'cooked-recipe');

    expect(prismaMock.collection.create).toHaveBeenCalled();
  });

  it('does NOT fire when prior cooks of the cuisine exist', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue({ cuisine: 'Persian' });
    prismaMock.cookingLog.count.mockResolvedValue(4);

    await maybeFireCuisineUnlock('u1', 'cooked-recipe');

    expect(prismaMock.collection.create).not.toHaveBeenCalled();
  });

  it('does NOT fire when the recipe has no cuisine', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue({ cuisine: null });

    await maybeFireCuisineUnlock('u1', 'cooked-recipe');

    expect(prismaMock.cookingLog.count).not.toHaveBeenCalled();
    expect(prismaMock.collection.create).not.toHaveBeenCalled();
  });

  it('swallows errors so the cooking flow is never blocked', async () => {
    prismaMock.recipe.findUnique.mockRejectedValue(new Error('db down'));
    await expect(maybeFireCuisineUnlock('u1', 'cooked-recipe')).resolves.toBeUndefined();
  });
});
