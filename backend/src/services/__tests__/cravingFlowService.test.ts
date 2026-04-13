// backend/src/services/__tests__/cravingFlowService.test.ts
// Unit tests for cravingFlowService — craving text → {original, healthified, honestyNote}.

// Mock AIProviderManager so the constructor doesn't require env keys.
const mockGenerateRecipe = jest.fn();
jest.mock('../aiProviders/AIProviderManager', () => ({
  AIProviderManager: jest.fn().mockImplementation(() => ({
    generateRecipe: mockGenerateRecipe,
  })),
}));

import { CravingFlowService } from '../cravingFlowService';

describe('CravingFlowService', () => {
  let service: CravingFlowService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CravingFlowService();
  });

  it('parses original + healthified + honestyNote from AI response', async () => {
    mockGenerateRecipe.mockResolvedValueOnce({
      original: {
        name: 'Classic Pepperoni Pizza',
        description: 'A typical 2-slice serving',
        calories: 800,
        protein: 35,
        carbs: 90,
        fat: 32,
      },
      healthified: {
        title: 'Cauliflower Crust Pizza',
        description: 'Lighter pizza with veggie crust and part-skim cheese',
        cuisine: 'Italian',
        cookTime: 30,
        servings: 1,
        calories: 380,
        protein: 32,
        carbs: 28,
        fat: 14,
        ingredients: [
          { text: '1 cauliflower crust', order: 1 },
          { text: '1/2 cup skim mozzarella', order: 2 },
        ],
        instructions: [
          { text: 'Bake crust at 425', step: 1 },
          { text: 'Top and bake 10 more minutes', step: 2 },
        ],
      },
      honestyNote: "Won't lie — not quite Round Table, but it'll crush the craving at half the calories.",
    });

    const result = await service.healthifyCraving({ craving: 'pizza' });

    expect(result.original.calories).toBe(800);
    expect(result.healthified.calories).toBe(380);
    expect(result.healthified.title).toBe('Cauliflower Crust Pizza');
    expect(result.honestyNote).toContain('crush the craving');
    expect(result.healthified.ingredients).toHaveLength(2);
  });

  it('includes user macro goals in prompt when provided', async () => {
    mockGenerateRecipe.mockResolvedValueOnce({
      original: { name: 'Burger', description: '', calories: 700, protein: 30, carbs: 50, fat: 40 },
      healthified: {
        title: 'Turkey Lettuce Burger',
        description: '',
        cuisine: 'American',
        cookTime: 15,
        servings: 1,
        calories: 350,
        protein: 38,
        carbs: 15,
        fat: 12,
        ingredients: [],
        instructions: [],
      },
      honestyNote: 'Lean but satisfying.',
    });

    await service.healthifyCraving({
      craving: 'burger',
      userMacroGoals: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    });

    const call = mockGenerateRecipe.mock.calls[0][0];
    expect(call.prompt).toContain('2000');
    expect(call.prompt).toContain('150');
    expect(call.prompt).toContain('burger');
  });

  it('throws when AI response is missing required fields', async () => {
    mockGenerateRecipe.mockResolvedValueOnce({ foo: 'bar' });

    await expect(service.healthifyCraving({ craving: 'pasta' })).rejects.toThrow(/invalid/i);
  });

  it('throws on empty craving text', async () => {
    await expect(service.healthifyCraving({ craving: '' })).rejects.toThrow(/craving/i);
    await expect(service.healthifyCraving({ craving: '   ' })).rejects.toThrow(/craving/i);
  });

  it('clamps absurd macro values to reasonable ranges', async () => {
    mockGenerateRecipe.mockResolvedValueOnce({
      original: { name: 'Pizza', description: '', calories: 99999, protein: -10, carbs: 90, fat: 30 },
      healthified: {
        title: 'Light Pizza',
        description: '',
        cuisine: 'Italian',
        cookTime: 25,
        servings: 1,
        calories: 400,
        protein: 30,
        carbs: 30,
        fat: 12,
        ingredients: [],
        instructions: [],
      },
      honestyNote: 'ok',
    });

    const result = await service.healthifyCraving({ craving: 'pizza' });
    expect(result.original.calories).toBeLessThanOrEqual(5000);
    expect(result.original.protein).toBeGreaterThanOrEqual(0);
  });
});
