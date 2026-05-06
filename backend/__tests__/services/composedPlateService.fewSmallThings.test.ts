// backend/__tests__/services/composedPlateService.fewSmallThings.test.ts
// ROADMAP 4.0 Tier J17.2 — "A few small things" plate archetype (TDD).
//
// The archetype expands slot count from the default 3 to 4–6 small
// components — izakaya / mezze / banchan / antipasti structures, surfaced
// as a STYLE, never a health pitch. Persisted via `ComposedPlate.archetype`.
// Falls back to the standard 3-slot composition when the catalog has
// insufficient variety (<4 unique component types available to the user).

import { generateFewSmallThingsPlate } from '../../src/services/composedPlateService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

const baseComponent = (overrides: Record<string, unknown> = {}) => ({
  id: 'c-default',
  slot: 'protein',
  name: 'Default Component',
  caloriesPerPortion: 200,
  proteinG: 20,
  carbsG: 10,
  fatG: 5,
  estimatedCostPerPortion: 2,
  cuisineTags: '[]',
  dietaryTags: '[]',
  pantryIngredientNames: '[]',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.mealComponent = mockPrisma.mealComponent ?? { findMany: jest.fn() };
  mockPrisma.mealComponent.findMany = jest.fn();
  mockPrisma.composedPlate = mockPrisma.composedPlate ?? { create: jest.fn() };
  mockPrisma.composedPlate.create = jest.fn().mockImplementation(({ data }: any) => ({
    id: 'plate-1',
    ...data,
  }));
  mockPrisma.pantryItem = mockPrisma.pantryItem ?? { findMany: jest.fn() };
  mockPrisma.pantryItem.findMany = jest.fn().mockResolvedValue([]);
});

describe('generateFewSmallThingsPlate', () => {
  it('produces 4–6 component slots when the catalog has enough variety', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      baseComponent({ id: 'p1', slot: 'protein', name: 'Charred chicken thigh' }),
      baseComponent({ id: 'p2', slot: 'protein', name: 'Marinated tofu' }),
      baseComponent({ id: 'b1', slot: 'base', name: 'Steamed brown rice' }),
      baseComponent({ id: 'b2', slot: 'base', name: 'Quinoa pilaf' }),
      baseComponent({ id: 'v1', slot: 'vegetable', name: 'Sesame greens' }),
      baseComponent({ id: 'v2', slot: 'vegetable', name: 'Cucumber salad' }),
      baseComponent({ id: 's1', slot: 'sauce', name: 'Ginger scallion' }),
      baseComponent({ id: 'g1', slot: 'garnish', name: 'Pickled radish' }),
    ]);

    const result = await generateFewSmallThingsPlate({ userId: 'u1' });

    expect(result.archetype).toBe('few_small_things');
    expect(result.components.length).toBeGreaterThanOrEqual(4);
    expect(result.components.length).toBeLessThanOrEqual(6);
  });

  it('persists the archetype tag on the created ComposedPlate', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      baseComponent({ id: 'p1', slot: 'protein' }),
      baseComponent({ id: 'b1', slot: 'base' }),
      baseComponent({ id: 'v1', slot: 'vegetable' }),
      baseComponent({ id: 's1', slot: 'sauce' }),
      baseComponent({ id: 'g1', slot: 'garnish' }),
    ]);

    await generateFewSmallThingsPlate({ userId: 'u1' });

    expect(mockPrisma.composedPlate.create).toHaveBeenCalled();
    const callArg = mockPrisma.composedPlate.create.mock.calls[0][0];
    expect(callArg.data.archetype).toBe('few_small_things');
  });

  it('falls back to the standard 3-slot plate when the catalog has insufficient variety', async () => {
    // Only 2 distinct slot types — well below the 4-slot floor for the
    // archetype.
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      baseComponent({ id: 'p1', slot: 'protein' }),
      baseComponent({ id: 'p2', slot: 'protein' }),
      baseComponent({ id: 'b1', slot: 'base' }),
    ]);

    const result = await generateFewSmallThingsPlate({ userId: 'u1' });

    expect(result.archetype).toBe('standard');
    expect(result.components.length).toBe(3);
  });

  it('falls back when no components are available', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([]);
    const result = await generateFewSmallThingsPlate({ userId: 'u1' });
    expect(result.archetype).toBe('standard');
    expect(result.components.length).toBe(0);
  });

  it('includes at least one of every slot the catalog covers up to the slot cap', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      baseComponent({ id: 'p1', slot: 'protein' }),
      baseComponent({ id: 'b1', slot: 'base' }),
      baseComponent({ id: 'v1', slot: 'vegetable' }),
      baseComponent({ id: 's1', slot: 'sauce' }),
      baseComponent({ id: 'g1', slot: 'garnish' }),
    ]);

    const result = await generateFewSmallThingsPlate({ userId: 'u1' });
    const slots = new Set(result.components.map((c) => c.slot));
    expect(slots.size).toBeGreaterThanOrEqual(4);
  });
});
