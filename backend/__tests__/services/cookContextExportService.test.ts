// X-B1 (founder roadmap Tier X — Moat Hardening): cook context export
// service tests. Versioned, PII-aware, deterministic. Pins:
//   - Schema validity (every field present, even for new users)
//   - User scoping (every prisma call uses the userId we passed)
//   - Determinism (sorted lists, byte-identical exports across calls)
//   - PII safety (no per-item pantry list, no notes, no email/name)
//   - Restrictions non-droppable (allergens/dietary survive empty exports)

import { prisma } from '../../src/lib/prisma';
import {
  buildCookContextExport,
  cookContextV1Schema,
} from '../../src/services/cookContextExportService';

const userPrefs = (prisma as unknown as {
  userPreferences: { findUnique: jest.Mock };
}).userPreferences;
const pantry = (prisma as unknown as {
  pantryItem: { findMany: jest.Mock };
}).pantryItem;
const cookingLog = (prisma as unknown as {
  cookingLog: { findMany: jest.Mock };
}).cookingLog;

beforeEach(() => {
  userPrefs.findUnique.mockReset();
  pantry.findMany.mockReset();
  cookingLog.findMany.mockReset();
});

describe('buildCookContextExport — empty-user contract', () => {
  it('returns valid v1 shape for a brand-new user (no prefs/pantry/cooks)', async () => {
    userPrefs.findUnique.mockResolvedValue(null);
    pantry.findMany.mockResolvedValue([]);
    cookingLog.findMany.mockResolvedValue([]);

    const result = await buildCookContextExport({ prisma, userId: 'u_new' });

    // Every field present, lists empty, restrictions present-but-empty.
    expect(result).toEqual({
      version: 'v1',
      taste: { likedCuisines: [], spiceLevel: null },
      restrictions: { allergens: [], dietary: [], bannedIngredients: [] },
      pantrySummary: { itemCount: 0, topCategories: [] },
      recentCooks: [],
      skillTier: null,
    });
    // Round-trips through the public schema.
    expect(() => cookContextV1Schema.parse(result)).not.toThrow();
  });

  it('always queries with the passed userId (IDOR safety)', async () => {
    userPrefs.findUnique.mockResolvedValue(null);
    pantry.findMany.mockResolvedValue([]);
    cookingLog.findMany.mockResolvedValue([]);

    await buildCookContextExport({ prisma, userId: 'u_42' });

    expect(userPrefs.findUnique).toHaveBeenCalledWith({
      where: { userId: 'u_42' },
      include: expect.any(Object),
    });
    expect(pantry.findMany).toHaveBeenCalledWith({
      where: { userId: 'u_42' },
      select: { category: true },
    });
    expect(cookingLog.findMany).toHaveBeenCalledWith({
      where: { userId: 'u_42' },
      orderBy: { cookedAt: 'desc' },
      take: expect.any(Number),
      select: expect.any(Object),
    });
  });
});

describe('buildCookContextExport — populated user', () => {
  beforeEach(() => {
    userPrefs.findUnique.mockResolvedValue({
      userId: 'u1',
      spiceLevel: 'medium',
      cookingSkillLevel: 'home_cook',
      likedCuisines: [{ name: 'Italian' }, { name: 'thai' }, { name: 'ITALIAN' }],
      dietaryRestrictions: [{ name: 'vegetarian' }],
      bannedIngredients: [{ name: 'peanut' }, { name: 'shellfish' }],
    });
    pantry.findMany.mockResolvedValue([
      { category: 'pantry-staples' },
      { category: 'pantry-staples' },
      { category: 'produce' },
      { category: 'produce' },
      { category: 'produce' },
      { category: 'dairy' },
      { category: null }, // dropped
      { category: '' },   // dropped
    ]);
    cookingLog.findMany.mockResolvedValue([
      {
        cookedAt: new Date('2026-05-22T18:00:00Z'),
        recipe: { title: 'Carbonara', cuisine: 'Italian' },
      },
      {
        cookedAt: new Date('2026-05-21T18:00:00Z'),
        recipe: { title: 'Pad Thai', cuisine: 'Thai' },
      },
      {
        cookedAt: new Date('2026-05-20T18:00:00Z'),
        recipe: null, // dropped — no recipe to name
      },
    ]);
  });

  it('returns the full populated shape', async () => {
    const result = await buildCookContextExport({ prisma, userId: 'u1' });

    expect(result.taste.spiceLevel).toBe('medium');
    expect(result.skillTier).toBe('home_cook');
    // Liked cuisines deduped (case-insensitive) + sorted alphabetically.
    expect(result.taste.likedCuisines).toEqual(['Italian', 'thai']);
    expect(result.restrictions.dietary).toEqual(['vegetarian']);
    expect(result.restrictions.allergens).toEqual(['peanut', 'shellfish']);
    expect(result.pantrySummary.itemCount).toBe(8);
    // Top categories sorted by count descending; ties by name asc.
    expect(result.pantrySummary.topCategories).toEqual([
      'produce',
      'pantry-staples',
      'dairy',
    ]);
    // Recent cooks: ISO timestamps + recipe with null filtered out.
    expect(result.recentCooks).toEqual([
      {
        recipeName: 'Carbonara',
        cuisine: 'Italian',
        cookedAt: '2026-05-22T18:00:00.000Z',
      },
      {
        recipeName: 'Pad Thai',
        cuisine: 'Thai',
        cookedAt: '2026-05-21T18:00:00.000Z',
      },
    ]);
  });

  it('passes schema validation', async () => {
    const result = await buildCookContextExport({ prisma, userId: 'u1' });
    expect(() => cookContextV1Schema.parse(result)).not.toThrow();
  });

  it('output is deterministic across consecutive calls', async () => {
    const a = await buildCookContextExport({ prisma, userId: 'u1' });
    const b = await buildCookContextExport({ prisma, userId: 'u1' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('buildCookContextExport — PII / safety contracts', () => {
  it('never returns per-item pantry names — only counts + categories', async () => {
    userPrefs.findUnique.mockResolvedValue(null);
    pantry.findMany.mockResolvedValue([
      { category: 'produce' },
      { category: 'produce' },
    ]);
    cookingLog.findMany.mockResolvedValue([]);

    const result = await buildCookContextExport({ prisma, userId: 'u_pii' });

    // No `name` / `items` field on pantrySummary.
    expect((result.pantrySummary as Record<string, unknown>).items).toBeUndefined();
    expect((result.pantrySummary as Record<string, unknown>).name).toBeUndefined();
    expect(result.pantrySummary.itemCount).toBe(2);
  });

  it('never includes cook notes (only name + cuisine + timestamp)', async () => {
    userPrefs.findUnique.mockResolvedValue(null);
    pantry.findMany.mockResolvedValue([]);
    cookingLog.findMany.mockResolvedValue([
      {
        cookedAt: new Date('2026-05-22T18:00:00Z'),
        recipe: { title: 'Carbonara', cuisine: 'Italian' },
        notes: 'used extra cheese, was AMAZING', // ← MUST not leak
      },
    ]);

    const result = await buildCookContextExport({ prisma, userId: 'u_pii' });

    const first = result.recentCooks[0] as Record<string, unknown>;
    expect(first.notes).toBeUndefined();
    expect(Object.keys(first).sort()).toEqual([
      'cookedAt',
      'cuisine',
      'recipeName',
    ]);
  });

  it('restrictions are non-droppable — survives an otherwise-empty export', async () => {
    userPrefs.findUnique.mockResolvedValue({
      userId: 'u_safety',
      spiceLevel: null,
      cookingSkillLevel: null,
      likedCuisines: [],
      dietaryRestrictions: [],
      bannedIngredients: [{ name: 'peanut' }],
    });
    pantry.findMany.mockResolvedValue([]);
    cookingLog.findMany.mockResolvedValue([]);

    const result = await buildCookContextExport({
      prisma,
      userId: 'u_safety',
    });

    expect(result.restrictions.allergens).toContain('peanut');
    expect(result.restrictions.bannedIngredients).toContain('peanut');
  });

  it('unknown skill tier values fall back to null (allowlist gate)', async () => {
    userPrefs.findUnique.mockResolvedValue({
      userId: 'u_skill',
      spiceLevel: null,
      cookingSkillLevel: 'wizard', // not in the allowlist
      likedCuisines: [],
      dietaryRestrictions: [],
      bannedIngredients: [],
    });
    pantry.findMany.mockResolvedValue([]);
    cookingLog.findMany.mockResolvedValue([]);

    const result = await buildCookContextExport({ prisma, userId: 'u_skill' });
    expect(result.skillTier).toBeNull();
  });
});
