// backend/tests/modules/flavorBoost.test.ts
// Tests for FlavorBoostService — parseResult logic and calorie enforcement.

import { FlavorBoostService, type FlavorBoostSuggestion } from '../../src/services/flavorBoostService';

// Mock AIProviderManager to return controlled JSON
jest.mock('../../src/services/aiProviders/AIProviderManager', () => ({
  AIProviderManager: jest.fn().mockImplementation(() => ({
    generateRecipe: jest.fn(),
  })),
}));

const AI_RESPONSE_BLAND_CHICKEN = {
  flavorProfile: 'mild, plain, savory',
  suggestions: [
    {
      addition: '1 tbsp gochujang',
      description: 'for a Korean kick',
      category: 'sauce',
      macroCost: { calories: 15, carbs: 3, fat: 0 },
    },
    {
      addition: '1 tsp smoked paprika',
      description: 'deep smoky warmth',
      category: 'spice',
      macroCost: { calories: 6, carbs: 1 },
    },
    {
      addition: '2 tbsp chimichurri',
      description: 'fresh herby brightness',
      category: 'sauce',
      macroCost: { calories: 30, fat: 3 },
    },
    {
      addition: '1 tbsp toasted sesame seeds',
      description: 'nutty crunch',
      category: 'topping',
      macroCost: { calories: 45, fat: 4, protein: 1 },
    },
    {
      addition: 'squeeze of lime juice',
      description: 'bright acidity',
      category: 'acid',
      macroCost: { calories: 3 },
    },
  ],
};

const BLAND_RECIPE = {
  title: 'Plain Grilled Chicken',
  cuisine: 'American',
  ingredients: ['chicken breast', 'salt', 'pepper'],
  calories: 300,
  protein: 42,
  carbs: 0,
  fat: 8,
};

describe('FlavorBoostService', () => {
  let service: FlavorBoostService;

  beforeEach(() => {
    service = new FlavorBoostService();
    const mockProvider = (service as any).providerManager;
    mockProvider.generateRecipe.mockResolvedValue(AI_RESPONSE_BLAND_CHICKEN);
  });

  it('flavor boost for a bland chicken recipe returns >=3 suggestions', async () => {
    const result = await service.getFlavorBoosts(BLAND_RECIPE);
    expect(result.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(result.flavorProfile).toBeTruthy();
  });

  it('each suggestion adds <=50 calories', async () => {
    const result = await service.getFlavorBoosts(BLAND_RECIPE);
    for (const suggestion of result.suggestions) {
      expect(suggestion.macroCost.calories).toBeLessThanOrEqual(50);
    }
  });

  it('suggestions include specific quantities ("1 tbsp gochujang")', async () => {
    const result = await service.getFlavorBoosts(BLAND_RECIPE);
    const gochujang = result.suggestions.find((s) =>
      s.addition.toLowerCase().includes('gochujang'),
    );
    expect(gochujang).toBeDefined();
    expect(gochujang!.addition).toMatch(/\d+\s*(tbsp|tsp|cup)/);
  });

  it('filters out suggestions exceeding 50 calories', async () => {
    const mockProvider = (service as any).providerManager;
    mockProvider.generateRecipe.mockResolvedValue({
      flavorProfile: 'bland',
      suggestions: [
        {
          addition: '3 tbsp butter',
          description: 'rich',
          category: 'topping',
          macroCost: { calories: 102, fat: 12 },
        },
        {
          addition: '1 tsp hot sauce',
          description: 'spicy',
          category: 'sauce',
          macroCost: { calories: 5 },
        },
      ],
    });

    const result = await service.getFlavorBoosts(BLAND_RECIPE);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].addition).toContain('hot sauce');
  });

  it('limits to 5 suggestions max', async () => {
    const mockProvider = (service as any).providerManager;
    const manySuggestions = Array.from({ length: 8 }, (_, i) => ({
      addition: `${i + 1} tsp spice-${i}`,
      description: `flavor ${i}`,
      category: 'spice',
      macroCost: { calories: 5 },
    }));
    mockProvider.generateRecipe.mockResolvedValue({
      flavorProfile: 'bland',
      suggestions: manySuggestions,
    });

    const result = await service.getFlavorBoosts(BLAND_RECIPE);
    expect(result.suggestions.length).toBeLessThanOrEqual(5);
  });
});
