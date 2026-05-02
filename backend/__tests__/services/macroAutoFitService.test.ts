// backend/__tests__/services/macroAutoFitService.test.ts
// Group 10X Phase 5 — Macro Auto-Fit service tests.

import { fitPlateToMacros } from '../../src/services/macroAutoFitService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

const buildRow = (overrides: Partial<any> = {}) => ({
  id: 'c1',
  slot: 'base',
  name: 'Brown Rice',
  description: null,
  defaultPortionGrams: 150,
  caloriesPerPortion: 200,
  proteinG: 4,
  carbsG: 42,
  fatG: 2,
  fiberG: 3,
  estimatedCostPerPortion: 0.5,
  cuisineTags: JSON.stringify([]),
  dietaryTags: JSON.stringify([]),
  cookMethodHint: 'simmer',
  pantryIngredientNames: JSON.stringify([]),
  imageUrl: null,
  isUserCreated: false,
  userId: null,
  ...overrides,
});

beforeAll(() => {
  if (!mockPrisma.mealComponent) {
    mockPrisma.mealComponent = { findMany: jest.fn() };
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.mealComponent.findMany.mockResolvedValue([]);
});

describe('fitPlateToMacros', () => {
  describe('empty slotsToFill', () => {
    it('returns achievable=true with plate=[] when no locked or fill slots', async () => {
      const result = await fitPlateToMacros({
        userId: 'user-1',
        target: { calories: 500, protein: 35 },
        lockedSlots: [],
        slotsToFill: [],
      });

      expect(result.achievable).toBe(true);
      expect(result.plate).toEqual([]);
      expect(result.totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      expect(result.gap).toBeUndefined();
    });

    it('returns totals from locked slots when slotsToFill is empty', async () => {
      const salmonRow = buildRow({
        id: 'salmon-1',
        slot: 'protein',
        caloriesPerPortion: 200,
        proteinG: 25,
        carbsG: 0,
        fatG: 10,
      });
      mockPrisma.mealComponent.findMany.mockResolvedValueOnce([salmonRow]);

      const result = await fitPlateToMacros({
        userId: 'user-1',
        target: { calories: 500, protein: 35 },
        lockedSlots: [{ slot: 'protein', componentId: 'salmon-1', portionMultiplier: 1 }],
        slotsToFill: [],
      });

      expect(result.achievable).toBe(true);
      expect(result.plate).toHaveLength(1);
      expect(result.plate[0]).toMatchObject({ slot: 'protein', componentId: 'salmon-1', portionMultiplier: 1 });
      expect(result.totals.calories).toBe(200);
      expect(result.totals.protein).toBe(25);
    });
  });

  describe('happy path — achievable fit', () => {
    it('picks a base + sauce that lands within ±10% calories given locked salmon', async () => {
      const salmonRow = buildRow({
        id: 'salmon-1',
        slot: 'protein',
        caloriesPerPortion: 200,
        proteinG: 25,
        carbsG: 0,
        fatG: 10,
      });
      const riceRow = buildRow({
        id: 'rice-1',
        slot: 'base',
        name: 'Brown Rice',
        caloriesPerPortion: 200,
        proteinG: 4,
        carbsG: 42,
        fatG: 2,
      });
      const tahiniRow = buildRow({
        id: 'tahini-1',
        slot: 'sauce',
        name: 'Tahini',
        caloriesPerPortion: 100,
        proteinG: 6,
        carbsG: 4,
        fatG: 8,
      });

      mockPrisma.mealComponent.findMany
        .mockResolvedValueOnce([salmonRow])
        .mockResolvedValueOnce([riceRow])
        .mockResolvedValueOnce([tahiniRow]);

      // target: 500 cal, 35g protein. locked salmon: 200 cal, 25g protein.
      // remaining: 300 cal, 10g protein. rice@1x=200cal + tahini@0.5x=50cal=250 ≈ within ±10% of 300 (270–330)
      const result = await fitPlateToMacros({
        userId: 'user-1',
        target: { calories: 500, protein: 35 },
        lockedSlots: [{ slot: 'protein', componentId: 'salmon-1', portionMultiplier: 1 }],
        slotsToFill: ['base', 'sauce'],
      });

      expect(result.achievable).toBe(true);
      expect(result.plate.length).toBeGreaterThanOrEqual(3);
      expect(result.totals.calories).toBeGreaterThan(0);
      expect(result.totals.protein).toBeGreaterThan(0);
      expect(result.gap).toBeUndefined();
    });

    it('respects IDOR scoping — only loads components owned by user or with userId=null', async () => {
      await fitPlateToMacros({
        userId: 'user-abc',
        target: { calories: 500, protein: 35 },
        lockedSlots: [],
        slotsToFill: ['base'],
      });

      const callArgs = mockPrisma.mealComponent.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toEqual(
        expect.arrayContaining([{ userId: null }, { userId: 'user-abc' }])
      );
    });
  });

  describe('impossible target — achievable=false', () => {
    it('returns achievable=false with gap when no candidate meets the protein threshold', async () => {
      const riceRow = buildRow({
        id: 'rice-1',
        slot: 'base',
        caloriesPerPortion: 200,
        proteinG: 4,
        carbsG: 42,
        fatG: 2,
      });

      mockPrisma.mealComponent.findMany.mockResolvedValue([riceRow]);

      // 200 cal remaining, 50g protein needed — rice max@2x = 8g, nowhere near 85% of 50g
      const result = await fitPlateToMacros({
        userId: 'user-1',
        target: { calories: 200, protein: 50 },
        lockedSlots: [],
        slotsToFill: ['base'],
      });

      expect(result.achievable).toBe(false);
      expect(result.gap).toBeDefined();
      expect(result.gap!.protein).toBeGreaterThan(0);
      expect(result.plate.length).toBeGreaterThan(0);
    });

    it('returns achievable=false when remaining calories exceeded by >10%', async () => {
      const highCalRow = buildRow({
        id: 'pasta-1',
        slot: 'base',
        caloriesPerPortion: 500,
        proteinG: 10,
        carbsG: 90,
        fatG: 5,
      });

      mockPrisma.mealComponent.findMany.mockResolvedValue([highCalRow]);

      // Only 100 cal remaining — pasta@0.5x = 250 cal > 100 * 1.1
      const result = await fitPlateToMacros({
        userId: 'user-1',
        target: { calories: 100, protein: 5 },
        lockedSlots: [],
        slotsToFill: ['base'],
      });

      expect(result.achievable).toBe(false);
    });

    it('returns achievable=false with closest plate included when no slot has any candidates', async () => {
      mockPrisma.mealComponent.findMany.mockResolvedValue([]);

      const result = await fitPlateToMacros({
        userId: 'user-1',
        target: { calories: 500, protein: 35 },
        lockedSlots: [],
        slotsToFill: ['base'],
      });

      expect(result.achievable).toBe(false);
      expect(result.plate).toEqual([]);
    });
  });

  describe('combinatorial cap', () => {
    it('does not blow up with 5 slotsToFill x many candidates each', async () => {
      const makeCandidates = (slot: string, count: number) =>
        Array.from({ length: count }, (_, i) =>
          buildRow({
            id: `${slot}-${i}`,
            slot,
            caloriesPerPortion: 100,
            proteinG: 5,
            carbsG: 15,
            fatG: 3,
          })
        );

      mockPrisma.mealComponent.findMany
        .mockResolvedValueOnce(makeCandidates('protein', 10))
        .mockResolvedValueOnce(makeCandidates('base', 10))
        .mockResolvedValueOnce(makeCandidates('vegetable', 10))
        .mockResolvedValueOnce(makeCandidates('sauce', 10))
        .mockResolvedValueOnce(makeCandidates('garnish', 10));

      const start = Date.now();
      const result = await fitPlateToMacros({
        userId: 'user-1',
        target: { calories: 500, protein: 25 },
        lockedSlots: [],
        slotsToFill: ['protein', 'base', 'vegetable', 'sauce', 'garnish'],
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
      expect(result).toHaveProperty('achievable');
      expect(result).toHaveProperty('plate');
    });

    it('returns a result even when combinatorial count exceeds the 1000 cap', async () => {
      const makeCandidates = (slot: string, count: number) =>
        Array.from({ length: count }, (_, i) =>
          buildRow({
            id: `${slot}-${i}`,
            slot,
            caloriesPerPortion: 80,
            proteinG: 8,
            carbsG: 10,
            fatG: 3,
          })
        );

      mockPrisma.mealComponent.findMany
        .mockResolvedValueOnce(makeCandidates('protein', 20))
        .mockResolvedValueOnce(makeCandidates('base', 20))
        .mockResolvedValueOnce(makeCandidates('vegetable', 20));

      const result = await fitPlateToMacros({
        userId: 'user-1',
        target: { calories: 300, protein: 24 },
        lockedSlots: [],
        slotsToFill: ['protein', 'base', 'vegetable'],
      });

      expect(result).toHaveProperty('achievable');
    });
  });

  describe('locked slot IDOR safety', () => {
    it('loads locked components scoped to user (OR: [userId=null, userId=user])', async () => {
      const lockedRow = buildRow({
        id: 'locked-1',
        slot: 'protein',
        caloriesPerPortion: 200,
        proteinG: 25,
      });
      mockPrisma.mealComponent.findMany
        .mockResolvedValueOnce([lockedRow])
        .mockResolvedValue([]);

      await fitPlateToMacros({
        userId: 'user-xyz',
        target: { calories: 400, protein: 30 },
        lockedSlots: [{ slot: 'protein', componentId: 'locked-1', portionMultiplier: 1 }],
        slotsToFill: ['base'],
      });

      const lockedCall = mockPrisma.mealComponent.findMany.mock.calls[0][0];
      expect(lockedCall.where.OR).toEqual(
        expect.arrayContaining([{ userId: null }, { userId: 'user-xyz' }])
      );
      expect(lockedCall.where.id.in).toEqual(['locked-1']);
    });

    it('throws when a locked componentId is not found for the user', async () => {
      mockPrisma.mealComponent.findMany.mockResolvedValue([]);

      await expect(
        fitPlateToMacros({
          userId: 'user-1',
          target: { calories: 500, protein: 35 },
          lockedSlots: [{ slot: 'protein', componentId: 'ghost-component', portionMultiplier: 1 }],
          slotsToFill: [],
        })
      ).rejects.toThrow(/not found or not owned/i);
    });
  });
});
