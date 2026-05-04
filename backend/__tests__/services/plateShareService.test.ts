// backend/__tests__/services/plateShareService.test.ts
// Group 10X Phase 8 — social plate sharing tests.

import {
  createShareLink,
  getPlateBySlug,
  adaptComponentsToUser,
  getPlateOfTheWeek,
  savePlateForUser,
} from '../../src/services/plateShareService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-05-02T12:00:00Z'));
  mockPrisma.plateShare.findFirst.mockResolvedValue(null);
  mockPrisma.plateShare.findUnique.mockResolvedValue(null);
  mockPrisma.plateShare.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'share-1', ...data })
  );
  mockPrisma.composedPlate.findUnique.mockResolvedValue(null);
  mockPrisma.plateSave.groupBy.mockResolvedValue([]);
  mockPrisma.plateSave.upsert.mockResolvedValue({ id: 'save-1' });
});

afterAll(() => {
  jest.useRealTimers();
});

describe('createShareLink', () => {
  it('rejects when plate does not belong to the user (IDOR)', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce({
      id: 'plate-1',
      userId: 'somebody-else',
    });
    await expect(
      createShareLink({ plateId: 'plate-1', userId: 'user-1' })
    ).rejects.toThrow(/not found|forbidden/i);
    expect(mockPrisma.plateShare.create).not.toHaveBeenCalled();
  });

  it('rejects when plate does not exist', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce(null);
    await expect(
      createShareLink({ plateId: 'plate-ghost', userId: 'user-1' })
    ).rejects.toThrow(/not found/i);
  });

  it('returns existing share if one already exists for the plate (idempotent)', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce({
      id: 'plate-1',
      userId: 'user-1',
    });
    mockPrisma.plateShare.findFirst.mockResolvedValueOnce({
      id: 'share-existing',
      slug: 'cozy-tomato-7a3',
      plateId: 'plate-1',
    });
    const result = await createShareLink({ plateId: 'plate-1', userId: 'user-1' });
    expect(result.slug).toBe('cozy-tomato-7a3');
    expect(mockPrisma.plateShare.create).not.toHaveBeenCalled();
  });

  it('generates a stable slug and persists a new PlateShare', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce({
      id: 'plate-1',
      userId: 'user-1',
    });
    const result = await createShareLink({ plateId: 'plate-1', userId: 'user-1' });
    expect(result.slug).toMatch(/^[a-z0-9-]{6,80}$/);
    expect(mockPrisma.plateShare.create).toHaveBeenCalledWith({
      data: {
        slug: result.slug,
        plateId: 'plate-1',
        createdBy: 'user-1',
      },
    });
  });
});

describe('getPlateBySlug', () => {
  it('returns the plate joined to its share row', async () => {
    const plate = { id: 'plate-1', userId: 'u1', componentIds: '[]' };
    mockPrisma.plateShare.findUnique.mockResolvedValueOnce({
      id: 'share-1',
      slug: 'cozy-7a3',
      plateId: 'plate-1',
      plate,
    });
    const result = await getPlateBySlug('cozy-7a3');
    expect(result?.plate).toEqual(plate);
    expect(result?.slug).toBe('cozy-7a3');
  });

  it('returns null for unknown slug', async () => {
    mockPrisma.plateShare.findUnique.mockResolvedValueOnce(null);
    const result = await getPlateBySlug('does-not-exist');
    expect(result).toBeNull();
  });
});

describe('adaptComponentsToUser', () => {
  it('flags components missing from pantry as substitution candidates', () => {
    const sourceComponents = [
      { slot: 'protein' as const, componentId: 'salmon-1', portionMultiplier: 1 },
      { slot: 'base' as const, componentId: 'farro-1', portionMultiplier: 1 },
      { slot: 'sauce' as const, componentId: 'tahini-1', portionMultiplier: 0.5 },
    ];
    const userPantryComponentIds = new Set(['salmon-1', 'tahini-1']);
    const userBannedIds = new Set<string>();

    const adapted = adaptComponentsToUser(sourceComponents, userPantryComponentIds, userBannedIds);
    const farro = adapted.find((c) => c.componentId === 'farro-1')!;
    const salmon = adapted.find((c) => c.componentId === 'salmon-1')!;

    expect(farro.needsSubstitution).toBe(true);
    expect(salmon.needsSubstitution).toBe(false);
  });

  it('flags components in user banned list as banned', () => {
    const sourceComponents = [
      { slot: 'sauce' as const, componentId: 'peanut-1', portionMultiplier: 1 },
    ];
    const userPantryIds = new Set<string>();
    const userBannedIds = new Set(['peanut-1']);
    const adapted = adaptComponentsToUser(sourceComponents, userPantryIds, userBannedIds);
    expect(adapted[0].banned).toBe(true);
  });

  it('returns empty array for empty input (no crash)', () => {
    expect(adaptComponentsToUser([], new Set(), new Set())).toEqual([]);
  });
});

describe('getPlateOfTheWeek', () => {
  it('queries plate_saves grouped by plateId in past 7 days, ordered by count DESC', async () => {
    mockPrisma.plateSave.groupBy.mockResolvedValueOnce([
      { plateId: 'plate-A', _count: { plateId: 12 } },
      { plateId: 'plate-B', _count: { plateId: 3 } },
    ]);
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce({
      id: 'plate-A',
      userId: 'creator-1',
      componentIds: '[]',
    });

    const result = await getPlateOfTheWeek();
    expect(result?.plate.id).toBe('plate-A');
    expect(result?.saveCount).toBe(12);

    const groupArgs = mockPrisma.plateSave.groupBy.mock.calls[0][0];
    expect(groupArgs.where.createdAt.gt).toEqual(new Date('2026-04-25T12:00:00Z'));
    expect(groupArgs.orderBy._count.plateId).toBe('desc');
  });

  it('returns null when no plate has any saves in the past 7 days', async () => {
    mockPrisma.plateSave.groupBy.mockResolvedValueOnce([]);
    const result = await getPlateOfTheWeek();
    expect(result).toBeNull();
  });

  it('returns null when the top-saved plate has been deleted (defensive)', async () => {
    mockPrisma.plateSave.groupBy.mockResolvedValueOnce([
      { plateId: 'plate-deleted', _count: { plateId: 5 } },
    ]);
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce(null);
    const result = await getPlateOfTheWeek();
    expect(result).toBeNull();
  });

  describe('personalization (viewerUserId provided)', () => {
    const baseGroups = [
      { plateId: 'plate-A', _count: { plateId: 8 } },
      { plateId: 'plate-B', _count: { plateId: 3 } },
    ];
    const platesByPantryFavor = [
      {
        id: 'plate-A',
        userId: 'creator-a',
        componentIds: JSON.stringify([
          { slot: 'protein', componentId: 'p_unknown' },
        ]),
      },
      {
        id: 'plate-B',
        userId: 'creator-b',
        componentIds: JSON.stringify([
          { slot: 'protein', componentId: 'p_salmon' },
          { slot: 'base', componentId: 'b_farro' },
        ]),
      },
    ];

    it('re-ranks candidates by pantry coverage even when save count is lower', async () => {
      mockPrisma.plateSave.groupBy.mockResolvedValueOnce(baseGroups);
      mockPrisma.composedPlate.findMany.mockResolvedValueOnce(platesByPantryFavor);
      mockPrisma.pantryItem.findMany.mockResolvedValueOnce([
        { name: 'salmon' },
        { name: 'farro' },
      ]);
      mockPrisma.userPreferences.findUnique.mockResolvedValueOnce({
        likedCuisines: [],
        bannedIngredients: [],
      });
      mockPrisma.mealComponent.findMany.mockResolvedValueOnce([
        { id: 'p_unknown', pantryIngredientNames: JSON.stringify(['octopus']), cuisineTags: '[]' },
        { id: 'p_salmon', pantryIngredientNames: JSON.stringify(['salmon']), cuisineTags: '[]' },
        { id: 'b_farro', pantryIngredientNames: JSON.stringify(['farro']), cuisineTags: '[]' },
      ]);

      const result = await getPlateOfTheWeek('viewer-1');
      // plate-B wins despite lower save count (8 vs 3) because pantry covers
      // 100% of its ingredients vs 0% of plate-A's.
      expect(result?.plate.id).toBe('plate-B');
      expect(result?.reason).toMatch(/in your pantry/i);
    });

    it('disqualifies plates whose components contain banned ingredients', async () => {
      mockPrisma.plateSave.groupBy.mockResolvedValueOnce(baseGroups);
      mockPrisma.composedPlate.findMany.mockResolvedValueOnce(platesByPantryFavor);
      mockPrisma.pantryItem.findMany.mockResolvedValueOnce([{ name: 'salmon' }]);
      mockPrisma.userPreferences.findUnique.mockResolvedValueOnce({
        likedCuisines: [],
        bannedIngredients: [{ name: 'salmon' }],
      });
      mockPrisma.mealComponent.findMany.mockResolvedValueOnce([
        { id: 'p_unknown', pantryIngredientNames: JSON.stringify(['octopus']), cuisineTags: '[]' },
        { id: 'p_salmon', pantryIngredientNames: JSON.stringify(['salmon']), cuisineTags: '[]' },
        { id: 'b_farro', pantryIngredientNames: JSON.stringify(['farro']), cuisineTags: '[]' },
      ]);

      const result = await getPlateOfTheWeek('viewer-1');
      // plate-B is filtered out (contains banned salmon); plate-A wins by default.
      expect(result?.plate.id).toBe('plate-A');
    });

    it('applies cuisine bonus when plate matches viewer likedCuisines', async () => {
      mockPrisma.plateSave.groupBy.mockResolvedValueOnce(baseGroups);
      mockPrisma.composedPlate.findMany.mockResolvedValueOnce(platesByPantryFavor);
      mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
      mockPrisma.userPreferences.findUnique.mockResolvedValueOnce({
        likedCuisines: [{ name: 'Italian' }],
        bannedIngredients: [],
      });
      mockPrisma.mealComponent.findMany.mockResolvedValueOnce([
        { id: 'p_unknown', pantryIngredientNames: JSON.stringify([]), cuisineTags: '[]' },
        { id: 'p_salmon', pantryIngredientNames: JSON.stringify([]), cuisineTags: JSON.stringify(['Italian']) },
        { id: 'b_farro', pantryIngredientNames: JSON.stringify([]), cuisineTags: '[]' },
      ]);

      const result = await getPlateOfTheWeek('viewer-1');
      expect(result?.plate.id).toBe('plate-B');
      expect(result?.reason).toMatch(/cuisine you love/i);
    });

    it('returns null when all candidates are banned', async () => {
      mockPrisma.plateSave.groupBy.mockResolvedValueOnce(baseGroups);
      mockPrisma.composedPlate.findMany.mockResolvedValueOnce(platesByPantryFavor);
      mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
      mockPrisma.userPreferences.findUnique.mockResolvedValueOnce({
        likedCuisines: [],
        bannedIngredients: [{ name: 'salmon' }, { name: 'octopus' }, { name: 'farro' }],
      });
      mockPrisma.mealComponent.findMany.mockResolvedValueOnce([
        { id: 'p_unknown', pantryIngredientNames: JSON.stringify(['octopus']), cuisineTags: '[]' },
        { id: 'p_salmon', pantryIngredientNames: JSON.stringify(['salmon']), cuisineTags: '[]' },
        { id: 'b_farro', pantryIngredientNames: JSON.stringify(['farro']), cuisineTags: '[]' },
      ]);

      const result = await getPlateOfTheWeek('viewer-1');
      expect(result).toBeNull();
    });

    it('falls back to count-based reason when pantry + cuisine signals are weak', async () => {
      mockPrisma.plateSave.groupBy.mockResolvedValueOnce([
        { plateId: 'plate-A', _count: { plateId: 8 } },
      ]);
      mockPrisma.composedPlate.findMany.mockResolvedValueOnce([
        {
          id: 'plate-A',
          userId: 'creator-a',
          componentIds: JSON.stringify([{ slot: 'protein', componentId: 'p_x' }]),
        },
      ]);
      mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
      mockPrisma.userPreferences.findUnique.mockResolvedValueOnce({
        likedCuisines: [],
        bannedIngredients: [],
      });
      mockPrisma.mealComponent.findMany.mockResolvedValueOnce([
        { id: 'p_x', pantryIngredientNames: JSON.stringify(['weird']), cuisineTags: '[]' },
      ]);

      const result = await getPlateOfTheWeek('viewer-1');
      expect(result?.plate.id).toBe('plate-A');
      expect(result?.reason).toMatch(/cooks this week/i);
    });

    it('requests TOP_N_CANDIDATES when personalizing (not just 1)', async () => {
      mockPrisma.plateSave.groupBy.mockResolvedValueOnce([]);
      await getPlateOfTheWeek('viewer-1');
      const groupArgs = mockPrisma.plateSave.groupBy.mock.calls[0][0];
      expect(groupArgs.take).toBeGreaterThanOrEqual(5);
    });
  });
});

describe('savePlateForUser', () => {
  it('creates a plate save when the caller owns the source plate', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce({
      id: 'plate-A',
      userId: 'u1',
    });
    await savePlateForUser({ userId: 'u1', plateId: 'plate-A' });
    expect(mockPrisma.plateSave.upsert).toHaveBeenCalledWith({
      where: { userId_plateId: { userId: 'u1', plateId: 'plate-A' } },
      update: {},
      create: { userId: 'u1', plateId: 'plate-A' },
    });
  });

  it('creates a plate save when the source plate has a public share', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce({
      id: 'plate-A',
      userId: 'somebody-else',
    });
    mockPrisma.plateShare.findFirst.mockResolvedValueOnce({ id: 'share-1' });
    await savePlateForUser({ userId: 'u1', plateId: 'plate-A' });
    expect(mockPrisma.plateSave.upsert).toHaveBeenCalled();
  });

  it('rejects when the source plate does not exist', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce(null);
    await expect(
      savePlateForUser({ userId: 'u1', plateId: 'plate-ghost' }),
    ).rejects.toThrow(/not found|not available/i);
    expect(mockPrisma.plateSave.upsert).not.toHaveBeenCalled();
  });

  it('rejects when the source plate is private to another user (no share row)', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce({
      id: 'plate-A',
      userId: 'somebody-else',
    });
    mockPrisma.plateShare.findFirst.mockResolvedValueOnce(null);
    await expect(
      savePlateForUser({ userId: 'u1', plateId: 'plate-A' }),
    ).rejects.toThrow(/not found|not available/i);
    expect(mockPrisma.plateSave.upsert).not.toHaveBeenCalled();
  });
});
