// backend/__tests__/services/macroCapFitService.test.ts
// "Keep under" solver — picks the highest-quality plate whose totals stay
// under every user-supplied cap.

import { fitPlateUnderCaps } from '../../src/services/macroCapFitService';
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

describe('fitPlateUnderCaps', () => {
  describe('empty slotsToFill', () => {
    it('returns achievable=true with empty filled when no locked slots and no fill slots', async () => {
      const result = await fitPlateUnderCaps({
        userId: 'u1',
        caps: { calories: 600 },
        lockedSlots: [],
        slotsToFill: [],
      });

      expect(result.achievable).toBe(true);
      expect(result.filled).toEqual([]);
      expect(result.totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
      expect(result.exceeded).toBeUndefined();
    });

    it('returns achievable=false with exceeded when locked slots already exceed cap', async () => {
      const heavyRow = buildRow({
        id: 'heavy-1',
        slot: 'protein',
        caloriesPerPortion: 800,
        proteinG: 60,
        carbsG: 0,
        fatG: 50,
      });
      mockPrisma.mealComponent.findMany.mockResolvedValueOnce([heavyRow]);

      const result = await fitPlateUnderCaps({
        userId: 'u1',
        caps: { calories: 500 },
        lockedSlots: [{ slot: 'protein', componentId: 'heavy-1', portionMultiplier: 1 }],
        slotsToFill: [],
      });

      expect(result.achievable).toBe(false);
      expect(result.totals.calories).toBe(800);
      expect(result.exceeded).toEqual({ calories: 300 });
    });
  });

  describe('respects all caps when achievable', () => {
    it('returns a combo whose totals are under every cap', async () => {
      mockPrisma.mealComponent.findMany.mockImplementation((args: any) => {
        const slot = args.where?.slot;
        if (slot === 'protein') {
          return Promise.resolve([
            buildRow({ id: 'tofu', slot: 'protein', caloriesPerPortion: 150, proteinG: 18, carbsG: 4, fatG: 8, fiberG: 2 }),
          ]);
        }
        if (slot === 'base') {
          return Promise.resolve([
            buildRow({ id: 'rice', slot: 'base', caloriesPerPortion: 200, proteinG: 4, carbsG: 42, fatG: 2, fiberG: 3 }),
          ]);
        }
        if (slot === 'vegetable') {
          return Promise.resolve([
            buildRow({ id: 'broccoli', slot: 'vegetable', caloriesPerPortion: 50, proteinG: 4, carbsG: 10, fatG: 0.5, fiberG: 4 }),
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await fitPlateUnderCaps({
        userId: 'u1',
        caps: { calories: 600, fat: 30 },
        lockedSlots: [],
        slotsToFill: ['protein', 'base', 'vegetable'],
      });

      expect(result.achievable).toBe(true);
      expect(result.filled).toHaveLength(3);
      expect(result.totals.calories).toBeLessThanOrEqual(600);
      expect(result.totals.fat).toBeLessThanOrEqual(30);
      expect(result.exceeded).toBeUndefined();
    });

    it('respects a fiber-only cap', async () => {
      mockPrisma.mealComponent.findMany.mockImplementation((args: any) => {
        const slot = args.where?.slot;
        if (slot === 'protein') {
          return Promise.resolve([
            buildRow({ id: 'p1', slot: 'protein', caloriesPerPortion: 150, fiberG: 0 }),
          ]);
        }
        if (slot === 'base') {
          return Promise.resolve([
            buildRow({ id: 'b1', slot: 'base', caloriesPerPortion: 200, fiberG: 2 }),
            buildRow({ id: 'b2', slot: 'base', caloriesPerPortion: 200, fiberG: 8 }),
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await fitPlateUnderCaps({
        userId: 'u1',
        caps: { fiber: 5 },
        lockedSlots: [],
        slotsToFill: ['protein', 'base'],
      });

      expect(result.achievable).toBe(true);
      expect(result.totals.fiber).toBeLessThanOrEqual(5);
    });
  });

  describe('returns closest combo when no candidate respects caps', () => {
    it('returns achievable=false with exceeded showing each violated cap', async () => {
      mockPrisma.mealComponent.findMany.mockImplementation((args: any) => {
        const slot = args.where?.slot;
        if (slot === 'protein') {
          return Promise.resolve([
            // Even at the smallest portion (0.5x = 400 cal) this exceeds the 300 cap.
            buildRow({ id: 'p1', slot: 'protein', caloriesPerPortion: 800, proteinG: 50 }),
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await fitPlateUnderCaps({
        userId: 'u1',
        caps: { calories: 300 },
        lockedSlots: [],
        slotsToFill: ['protein'],
      });

      expect(result.achievable).toBe(false);
      expect(result.exceeded?.calories).toBeGreaterThan(0);
      // Should still return the closest plate (using the smallest portion = 0.5)
      expect(result.filled).toHaveLength(1);
    });
  });

  describe('locked slots are preserved', () => {
    it('includes locked slots verbatim and adds fill slots that respect caps', async () => {
      const lockedSalmon = buildRow({
        id: 'salmon',
        slot: 'protein',
        caloriesPerPortion: 250,
        proteinG: 28,
        carbsG: 0,
        fatG: 12,
      });
      // First call: locked lookup. Subsequent: per-slot candidate fetch.
      mockPrisma.mealComponent.findMany
        .mockResolvedValueOnce([lockedSalmon])
        .mockResolvedValueOnce([
          buildRow({ id: 'rice', slot: 'base', caloriesPerPortion: 200, carbsG: 42 }),
        ]);

      const result = await fitPlateUnderCaps({
        userId: 'u1',
        caps: { calories: 600 },
        lockedSlots: [{ slot: 'protein', componentId: 'salmon', portionMultiplier: 1 }],
        slotsToFill: ['base'],
      });

      expect(result.achievable).toBe(true);
      const slots = result.filled.map((f) => f.slot);
      expect(slots).toContain('protein');
      expect(slots).toContain('base');
      // Locked salmon must keep its portion multiplier
      const proteinSlot = result.filled.find((f) => f.slot === 'protein');
      expect(proteinSlot?.portionMultiplier).toBe(1);
    });

    it('throws when a locked component is missing or not owned', async () => {
      mockPrisma.mealComponent.findMany.mockResolvedValueOnce([]);

      await expect(
        fitPlateUnderCaps({
          userId: 'u1',
          caps: { calories: 600 },
          lockedSlots: [{ slot: 'protein', componentId: 'phantom', portionMultiplier: 1 }],
          slotsToFill: [],
        }),
      ).rejects.toThrow(/not found or not owned/i);
    });
  });

  describe('quality score', () => {
    it('prefers higher protein density when multiple combos respect every cap', async () => {
      mockPrisma.mealComponent.findMany.mockImplementation((args: any) => {
        const slot = args.where?.slot;
        if (slot === 'protein') {
          return Promise.resolve([
            // Low-protein vs high-protein. Cap is generous so both fit.
            buildRow({ id: 'p-low', slot: 'protein', caloriesPerPortion: 200, proteinG: 5, fiberG: 0 }),
            buildRow({ id: 'p-high', slot: 'protein', caloriesPerPortion: 200, proteinG: 30, fiberG: 0 }),
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await fitPlateUnderCaps({
        userId: 'u1',
        caps: { calories: 800 },
        lockedSlots: [],
        slotsToFill: ['protein'],
      });

      expect(result.achievable).toBe(true);
      const chosen = result.filled[0].component as any;
      expect(chosen.id).toBe('p-high');
    });
  });
});
