// Group 10Y Code#2: regression test that buildCoachProfileSnapshot wires
// real Prisma data into the system prompt — pantry, affinity, allergens,
// dietary, last7Cooks, skill tier. The bug was hardcoded empty arrays.

const mockPantryFindMany = jest.fn();
const mockLeftoverFindMany = jest.fn();
const mockSlotAffinityFindMany = jest.fn();
const mockPairAffinityFindMany = jest.fn();
const mockMacroGoalsFindUnique = jest.fn();
const mockUserPhysicalProfileFindUnique = jest.fn();
const mockMealFindMany = jest.fn();
const mockUserPreferencesFindUnique = jest.fn();
const mockCookingLogFindMany = jest.fn();
const mockComposedPlateCount = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pantryItem: { findMany: (...a: unknown[]) => mockPantryFindMany(...a) },
    leftoverInventory: {
      findMany: (...a: unknown[]) => mockLeftoverFindMany(...a),
    },
    slotAffinity: {
      findMany: (...a: unknown[]) => mockSlotAffinityFindMany(...a),
    },
    pairAffinity: {
      findMany: (...a: unknown[]) => mockPairAffinityFindMany(...a),
    },
    macroGoals: {
      findUnique: (...a: unknown[]) => mockMacroGoalsFindUnique(...a),
    },
    userPhysicalProfile: {
      findUnique: (...a: unknown[]) => mockUserPhysicalProfileFindUnique(...a),
    },
    meal: { findMany: (...a: unknown[]) => mockMealFindMany(...a) },
    userPreferences: {
      findUnique: (...a: unknown[]) => mockUserPreferencesFindUnique(...a),
    },
    cookingLog: {
      findMany: (...a: unknown[]) => mockCookingLogFindMany(...a),
    },
    composedPlate: {
      count: (...a: unknown[]) => mockComposedPlateCount(...a),
    },
  },
}));

import { buildCoachProfileSnapshot } from '../../src/services/coachTools';
import {
  buildProfileSnapshot,
  buildSystemPrompt,
} from '../../src/services/coachPromptService';

beforeEach(() => {
  jest.clearAllMocks();
  mockPantryFindMany.mockResolvedValue([]);
  mockLeftoverFindMany.mockResolvedValue([]);
  mockSlotAffinityFindMany.mockResolvedValue([]);
  mockPairAffinityFindMany.mockResolvedValue([]);
  mockMacroGoalsFindUnique.mockResolvedValue(null);
  mockUserPhysicalProfileFindUnique.mockResolvedValue(null);
  mockMealFindMany.mockResolvedValue([]);
  mockUserPreferencesFindUnique.mockResolvedValue(null);
  mockCookingLogFindMany.mockResolvedValue([]);
  mockComposedPlateCount.mockResolvedValue(0);
});

describe('buildCoachProfileSnapshot — N=1 wiring', () => {
  it('includes pantry items, allergens, and slot affinity in the system prompt', async () => {
    mockPantryFindMany.mockResolvedValue([
      { name: 'chicken thigh' },
      { name: 'jasmine rice' },
      { name: 'lime' },
    ]);
    mockSlotAffinityFindMany.mockResolvedValue([
      { componentId: 'comp-grilled-chicken', slot: 'protein', score: 0.92 },
      { componentId: 'comp-rice-bowl', slot: 'base', score: 0.81 },
    ]);
    mockUserPreferencesFindUnique.mockResolvedValue({
      id: 'p1',
      userId: 'user-1',
      cookTimePreference: 30,
      bannedIngredients: [{ name: 'peanut' }, { name: 'shellfish' }],
      likedCuisines: [{ name: 'Mediterranean' }],
      dietaryRestrictions: [{ name: 'high-protein' }],
    });
    mockUserPhysicalProfileFindUnique.mockResolvedValue({
      fitnessGoal: 'lose_weight',
    });

    const profile = await buildCoachProfileSnapshot('user-1');

    expect(profile.pantry).toEqual(
      expect.arrayContaining(['chicken thigh', 'jasmine rice', 'lime']),
    );
    expect(profile.allergens).toEqual(
      expect.arrayContaining(['peanut', 'shellfish']),
    );
    expect(profile.dietaryProfile).toEqual(['high-protein']);
    expect(profile.slotAffinity).toHaveLength(2);
    expect(profile.goalPhase).toBe('cut');

    const snap = buildProfileSnapshot(profile);
    const prompt = buildSystemPrompt(snap);

    expect(prompt).toContain('chicken thigh');
    expect(prompt).toContain('jasmine rice');
    expect(prompt).toContain('peanut');
    expect(prompt).toContain('shellfish');
    expect(prompt).toContain('comp-grilled-chicken');
    expect(prompt).toContain('Mediterranean');
    expect(prompt).toContain('"goalPhase":"cut"');
  });

  it('returns sensible empty defaults for a brand-new user', async () => {
    const profile = await buildCoachProfileSnapshot('user-new');
    expect(profile.pantry).toEqual([]);
    expect(profile.allergens).toEqual([]);
    expect(profile.slotAffinity).toEqual([]);
    expect(profile.pairAffinity).toEqual([]);
    expect(profile.last7Cooks).toEqual([]);
    expect(profile.cuisineAffinity).toEqual([]);
    expect(profile.goalPhase).toBe('maintain');
    expect(profile.skillTier).toBe('beginner');
  });

  it('promotes skillTier as the user accumulates cooked plates', async () => {
    mockComposedPlateCount.mockResolvedValue(25);
    const profile = await buildCoachProfileSnapshot('user-1');
    expect(profile.skillTier).toBe('chef');
  });

  it('emits last7Cooks from cookingLog with recipe titles', async () => {
    mockCookingLogFindMany.mockResolvedValue([
      {
        recipeId: 'r1',
        cookedAt: new Date('2026-05-02T00:00:00Z'),
        recipe: { id: 'r1', title: 'Salmon Bowl' },
      },
    ]);
    const profile = await buildCoachProfileSnapshot('user-1');
    expect(profile.last7Cooks).toHaveLength(1);
    expect(profile.last7Cooks[0].title).toBe('Salmon Bowl');
  });
});
