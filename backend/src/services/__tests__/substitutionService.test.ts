// backend/src/services/__tests__/substitutionService.test.ts
// Unit tests for the AI-powered conversational substitution service.
// Mocks AIProviderManager to return deterministic responses.

jest.mock('../aiProviders/AIProviderManager', () => {
  return {
    AIProviderManager: jest.fn().mockImplementation(() => ({
      generateRecipe: jest.fn(),
    })),
  };
});

import { SubstitutionService } from '../substitutionService';
import { AIProviderManager } from '../aiProviders/AIProviderManager';

const recipeFixture = {
  title: 'Thai Green Curry',
  cuisine: 'Thai',
  ingredients: [
    { text: '1 can coconut milk', order: 0 },
    { text: '2 tbsp green curry paste', order: 1 },
    { text: '1 lb chicken thighs, sliced', order: 2 },
    { text: '1 tbsp fish sauce', order: 3 },
  ],
  instructions: [
    { text: 'Heat coconut milk in a wok over medium heat.', step: 1 },
    { text: 'Add curry paste and stir until fragrant.', step: 2 },
    { text: 'Add chicken and cook through.', step: 3 },
    { text: 'Finish with fish sauce.', step: 4 },
  ],
  calories: 450,
  protein: 35,
  carbs: 12,
  fat: 30,
  fiber: 3,
};

function getMockProvider(service: SubstitutionService): jest.Mock {
  // Access the private providerManager via any cast
  return ((service as any).providerManager.generateRecipe) as jest.Mock;
}

describe('SubstitutionService', () => {
  let service: SubstitutionService;

  beforeEach(() => {
    (AIProviderManager as jest.Mock).mockClear();
    service = new SubstitutionService();
  });

  it('parses a simple ingredient-only substitution', async () => {
    const mockResponse = {
      ingredientChanges: [
        {
          original: '1 can coconut milk',
          replacement: '1 can light coconut milk',
          reason: 'Reduces fat significantly',
        },
      ],
      instructionChanges: [],
      macroImpact: { calories: -80, protein: 0, carbs: 0, fat: -10, fiber: 0 },
      summary: 'Swapping to light coconut milk cuts fat and calories without changing flavor much.',
    };
    getMockProvider(service).mockResolvedValue(mockResponse);

    const diff = await service.askSubstitution(recipeFixture, 'How can I make this lower fat?');

    expect(diff.ingredientChanges).toHaveLength(1);
    expect(diff.ingredientChanges[0].original).toBe('1 can coconut milk');
    expect(diff.ingredientChanges[0].replacement).toBe('1 can light coconut milk');
    expect(diff.instructionChanges).toHaveLength(0);
    expect(diff.macroImpact.calories).toBe(-80);
    expect(diff.macroImpact.fat).toBe(-10);
    expect(diff.summary).toContain('light coconut milk');
  });

  it('parses substitution with instruction changes', async () => {
    const mockResponse = {
      ingredientChanges: [
        {
          original: '1 lb chicken thighs, sliced',
          replacement: '1 lb firm tofu, pressed and cubed',
          reason: 'Plant-based protein',
        },
      ],
      instructionChanges: [
        {
          step: 3,
          original: 'Add chicken and cook through.',
          updated: 'Add tofu cubes and stir gently to coat.',
          reason: 'Tofu needs gentler handling than chicken',
        },
      ],
      macroImpact: { calories: -60, protein: -10, carbs: 3, fat: -5, fiber: 1 },
      summary: 'Going vegetarian! Pressed tofu keeps the texture interesting.',
    };
    getMockProvider(service).mockResolvedValue(mockResponse);

    const diff = await service.askSubstitution(recipeFixture, 'Make this vegetarian');

    expect(diff.ingredientChanges).toHaveLength(1);
    expect(diff.instructionChanges).toHaveLength(1);
    expect(diff.instructionChanges[0].step).toBe(3);
    expect(diff.instructionChanges[0].updated).toContain('tofu');
  });

  it('drops ingredient changes that do not match any original ingredient', async () => {
    const mockResponse = {
      ingredientChanges: [
        {
          original: '5 cups unicorn tears', // does not exist in recipe
          replacement: 'water',
          reason: 'silly',
        },
      ],
      instructionChanges: [],
      macroImpact: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      summary: 'No changes needed',
    };
    getMockProvider(service).mockResolvedValue(mockResponse);

    const diff = await service.askSubstitution(recipeFixture, 'test');

    expect(diff.ingredientChanges).toHaveLength(0);
  });

  it('drops instruction changes with invalid step numbers', async () => {
    const mockResponse = {
      ingredientChanges: [],
      instructionChanges: [
        { step: 999, original: 'foo', updated: 'bar', reason: 'test' },
      ],
      macroImpact: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      summary: 'test',
    };
    getMockProvider(service).mockResolvedValue(mockResponse);

    const diff = await service.askSubstitution(recipeFixture, 'test');

    expect(diff.instructionChanges).toHaveLength(0);
  });

  it('accepts partial matches on ingredient text and normalizes to the exact original', async () => {
    const mockResponse = {
      ingredientChanges: [
        {
          // Partial match — missing "1 can" prefix
          original: 'coconut milk',
          replacement: 'almond milk',
          reason: 'dairy-free',
        },
      ],
      instructionChanges: [],
      macroImpact: { calories: -100, protein: 0, carbs: 0, fat: -15, fiber: 0 },
      summary: 'Dairy free swap',
    };
    getMockProvider(service).mockResolvedValue(mockResponse);

    const diff = await service.askSubstitution(recipeFixture, "I don't have coconut milk");

    expect(diff.ingredientChanges).toHaveLength(1);
    // Should be normalized back to the EXACT recipe ingredient text
    expect(diff.ingredientChanges[0].original).toBe('1 can coconut milk');
    expect(diff.ingredientChanges[0].replacement).toBe('almond milk');
  });

  it('provides safe defaults when AI returns malformed JSON', async () => {
    getMockProvider(service).mockResolvedValue({
      // Missing most fields
      summary: 'Test',
    });

    const diff = await service.askSubstitution(recipeFixture, 'test');

    expect(diff.ingredientChanges).toEqual([]);
    expect(diff.instructionChanges).toEqual([]);
    expect(diff.macroImpact).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    expect(diff.summary).toBe('Test');
  });

  it('passes dietary restrictions into the prompt', async () => {
    getMockProvider(service).mockResolvedValue({
      ingredientChanges: [],
      instructionChanges: [],
      macroImpact: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      summary: 'No changes needed',
    });

    await service.askSubstitution(recipeFixture, 'Make this work for me', ['vegan', 'gluten-free']);

    const call = getMockProvider(service).mock.calls[0][0];
    expect(call.prompt).toContain('vegan');
    expect(call.prompt).toContain('gluten-free');
  });
});
