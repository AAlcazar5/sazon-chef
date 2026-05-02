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
    expect(result.slug).toMatch(/^[a-z0-9-]{6,40}$/);
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
});

describe('savePlateForUser', () => {
  it('creates a plate save (upsert to be idempotent)', async () => {
    await savePlateForUser({ userId: 'u1', plateId: 'plate-A' });
    expect(mockPrisma.plateSave.upsert).toHaveBeenCalledWith({
      where: { userId_plateId: { userId: 'u1', plateId: 'plate-A' } },
      update: {},
      create: { userId: 'u1', plateId: 'plate-A' },
    });
  });
});
