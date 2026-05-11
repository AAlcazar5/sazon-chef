// backend/__tests__/services/macroCapFitService.test.ts
// "Tune the plate" solver — picks the highest-quality plate whose totals stay
// within every user-supplied bound (min, max, or both).

import { fitPlateWithinBounds } from '../../src/services/macroCapFitService';
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

describe('fitPlateWithinBounds', () => {
  describe('empty slotsToFill', () => {
    it('returns achievable=true with empty filled when no locked slots and no fill slots', async () => {
      const result = await fitPlateWithinBounds({
        userId: 'u1',
        bounds: { calories: { max: 600 } },
        lockedSlots: [],
        slotsToFill: [],
      });

      expect(result.achievable).toBe(true);
      expect(result.filled).toEqual([]);
      expect(result.totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
      expect(result.outOfBounds).toBeUndefined();
    });

    it('returns achievable=false with outOfBounds when locked slots exceed max', async () => {
      const heavyRow = buildRow({
        id: 'heavy-1',
        slot: 'protein',
        caloriesPerPortion: 800,
        proteinG: 60,
        carbsG: 0,
        fatG: 50,
      });
      mockPrisma.mealComponent.findMany.mockResolvedValueOnce([heavyRow]);

      const result = await fitPlateWithinBounds({
        userId: 'u1',
        bounds: { calories: { max: 500 } },
        lockedSlots: [{ slot: 'protein', componentId: 'heavy-1', portionMultiplier: 1 }],
        slotsToFill: [],
      });

      expect(result.achievable).toBe(false);
      expect(result.totals.calories).toBe(800);
      expect(result.outOfBounds?.calories).toEqual({ type: 'over', amount: 300 });
    });
  });

  describe('max bounds (upper limit)', () => {
    it('returns a combo whose totals are under every max bound', async () => {
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

      const result = await fitPlateWithinBounds({
        userId: 'u1',
        bounds: { calories: { max: 600 }, fat: { max: 30 } },
        lockedSlots: [],
        slotsToFill: ['protein', 'base', 'vegetable'],
      });

      expect(result.achievable).toBe(true);
      expect(result.filled).toHaveLength(3);
      expect(result.totals.calories).toBeLessThanOrEqual(600);
      expect(result.totals.fat).toBeLessThanOrEqual(30);
      expect(result.outOfBounds).toBeUndefined();
    });

    it('respects a fiber-only max bound', async () => {
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

      const result = await fitPlateWithinBounds({
        userId: 'u1',
        bounds: { fiber: { max: 5 } },
        lockedSlots: [],
        slotsToFill: ['protein', 'base'],
      });

      expect(result.achievable).toBe(true);
      expect(result.totals.fiber).toBeLessThanOrEqual(5);
    });
  });

  describe('min bounds (at least)', () => {
    it('returns a combo with at least the required protein', async () => {
      mockPrisma.mealComponent.findMany.mockImplementation((args: any) => {
        const slot = args.where?.slot;
        if (slot === 'protein') {
          return Promise.resolve([
            // Multiple proteins — solver should pick one that hits the min.
            buildRow({ id: 'low', slot: 'protein', caloriesPerPortion: 100, proteinG: 8 }),
            buildRow({ id: 'high', slot: 'protein', caloriesPerPortion: 200, proteinG: 32 }),
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await fitPlateWithinBounds({
        userId: 'u1',
        bounds: { protein: { min: 20 } },
        lockedSlots: [],
        slotsToFill: ['protein'],
      });

      expect(result.achievable).toBe(true);
      expect(result.totals.protein).toBeGreaterThanOrEqual(20);
    });

    it('returns achievable=false with under violation when no combo can hit the min', async () => {
      mockPrisma.mealComponent.findMany.mockImplementation((args: any) => {
        const slot = args.where?.slot;
        if (slot === 'protein') {
          return Promise.resolve([
            // Even at max portion (2x), only 5g * 2 = 10g protein.
            buildRow({ id: 'tiny', slot: 'protein', caloriesPerPortion: 100, proteinG: 5 }),
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await fitPlateWithinBounds({
        userId: 'u1',
        bounds: { protein: { min: 50 } },
        lockedSlots: [],
        slotsToFill: ['protein'],
      });

      expect(result.achievable).toBe(false);
      expect(result.outOfBounds?.protein?.type).toBe('under');
      expect(result.outOfBounds?.protein?.amount).toBeGreaterThan(0);
    });
  });

  describe('mixed min and max bounds', () => {
    it('respects both directions on different macros (max calories + min fiber)', async () => {
      mockPrisma.mealComponent.findMany.mockImplementation((args: any) => {
        const slot = args.where?.slot;
        if (slot === 'protein') {
          return Promise.resolve([
            buildRow({ id: 'p1', slot: 'protein', caloriesPerPortion: 150, fiberG: 0 }),
          ]);
        }
        if (slot === 'vegetable') {
          return Promise.resolve([
            buildRow({ id: 'high-fiber', slot: 'vegetable', caloriesPerPortion: 80, fiberG: 8 }),
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await fitPlateWithinBounds({
        userId: 'u1',
        bounds: { calories: { max: 400 }, fiber: { min: 6 } },
        lockedSlots: [],
        slotsToFill: ['protein', 'vegetable'],
      });

      expect(result.achievable).toBe(true);
      expect(result.totals.calories).toBeLessThanOrEqual(400);
      expect(result.totals.fiber).toBeGreaterThanOrEqual(6);
    });

    it('respects a min-and-max on the same macro (range)', async () => {
      mockPrisma.mealComponent.findMany.mockImplementation((args: any) => {
        const slot = args.where?.slot;
        if (slot === 'protein') {
          return Promise.resolve([
            buildRow({ id: 'p1', slot: 'protein', caloriesPerPortion: 200, proteinG: 25 }),
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await fitPlateWithinBounds({
        userId: 'u1',
        bounds: { protein: { min: 20, max: 40 } },
        lockedSlots: [],
        slotsToFill: ['protein'],
      });

      expect(result.achievable).toBe(true);
      expect(result.totals.protein).toBeGreaterThanOrEqual(20);
      expect(result.totals.protein).toBeLessThanOrEqual(40);
    });
  });

  describe('locked slots are preserved', () => {
    it('includes locked slots verbatim and adds fill slots that respect bounds', async () => {
      const lockedSalmon = buildRow({
        id: 'salmon',
        slot: 'protein',
        caloriesPerPortion: 250,
        proteinG: 28,
        carbsG: 0,
        fatG: 12,
      });
      mockPrisma.mealComponent.findMany
        .mockResolvedValueOnce([lockedSalmon])
        .mockResolvedValueOnce([
          buildRow({ id: 'rice', slot: 'base', caloriesPerPortion: 200, carbsG: 42 }),
        ]);

      const result = await fitPlateWithinBounds({
        userId: 'u1',
        bounds: { calories: { max: 600 } },
        lockedSlots: [{ slot: 'protein', componentId: 'salmon', portionMultiplier: 1 }],
        slotsToFill: ['base'],
      });

      expect(result.achievable).toBe(true);
      const slots = result.filled.map((f) => f.slot);
      expect(slots).toContain('protein');
      expect(slots).toContain('base');
      const proteinSlot = result.filled.find((f) => f.slot === 'protein');
      expect(proteinSlot?.portionMultiplier).toBe(1);
    });

    it('throws when a locked component is missing or not owned', async () => {
      mockPrisma.mealComponent.findMany.mockResolvedValueOnce([]);

      await expect(
        fitPlateWithinBounds({
          userId: 'u1',
          bounds: { calories: { max: 600 } },
          lockedSlots: [{ slot: 'protein', componentId: 'phantom', portionMultiplier: 1 }],
          slotsToFill: [],
        }),
      ).rejects.toThrow(/not found or not owned/i);
    });
  });

  describe('quality score', () => {
    it('prefers higher protein density when multiple combos respect every bound', async () => {
      mockPrisma.mealComponent.findMany.mockImplementation((args: any) => {
        const slot = args.where?.slot;
        if (slot === 'protein') {
          return Promise.resolve([
            buildRow({ id: 'p-low', slot: 'protein', caloriesPerPortion: 200, proteinG: 5, fiberG: 0 }),
            buildRow({ id: 'p-high', slot: 'protein', caloriesPerPortion: 200, proteinG: 30, fiberG: 0 }),
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await fitPlateWithinBounds({
        userId: 'u1',
        bounds: { calories: { max: 800 } },
        lockedSlots: [],
        slotsToFill: ['protein'],
      });

      expect(result.achievable).toBe(true);
      const chosen = result.filled[0].component as any;
      expect(chosen.id).toBe('p-high');
    });
  });
});
