// Founder ask 2026-05-19: "are you using anthropic api? try deepseek
// instead". generateFromDescription forces every free-text caller onto
// Claude via `safeTier = tier === 'free' ? 'premium' : tier` (PII guard).
// That's correct for the recipe-CREATION flow ("my grandma's diabetic
// recipe…") but wrong for the WEDGE flow ("Grilled chicken") — the
// detector already constrains those queries to 2-5 word food names with
// no chat/greeting markers, so there's no PII to protect. This mode flag
// keeps free-tier wedge calls on the DeepSeek route.

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'test-key';

const mockedRoute = jest.fn();
const mockedGen = jest.fn();

jest.mock('../../src/services/aiProviders/AIProviderManager', () => {
  return {
    AIProviderManager: jest.fn().mockImplementation(() => ({
      routeToModel: mockedRoute,
      generateRecipe: mockedGen,
      getAvailableProviders: () => ['claude', 'deepseek'],
    })),
  };
});

import { aiRecipeService } from '../../src/services/aiRecipeService';

beforeEach(() => {
  jest.clearAllMocks();
  // Default route: pretend the real router returned a sensible shape.
  mockedRoute.mockReturnValue({
    model: 'deepseek-chat',
    provider: 'deepseek',
    providerOrder: ['deepseek', 'claude'],
  });
  mockedGen.mockResolvedValue({
    title: 'Grilled Chicken',
    description: 'Simple grilled chicken breast with herbs.',
    cuisine: 'American',
    mealType: 'dinner',
    cookTime: 25,
    difficulty: 'easy',
    servings: 2,
    calories: 400,
    protein: 35,
    carbs: 10,
    fat: 20,
    fiber: 2,
    ingredients: [
      { name: 'chicken breast', amount: 1, unit: 'lb' },
      { name: 'olive oil', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      { step: 1, instruction: 'Pat chicken dry.' },
      { step: 2, instruction: 'Grill for 8 minutes per side.' },
    ],
    tips: [],
    tags: [],
  });
});

describe('aiRecipeService.generateFromDescription — recipe-ask mode (founder 2026-05-19)', () => {
  it('default behavior (recipe creation): free tier is bumped to premium → Claude', async () => {
    // Original PII guard preserved for the recipe-creation flow where
    // free-text descriptions can contain PII ("my diabetic grandma's…").
    await aiRecipeService.generateFromDescription('grilled chicken', 'free');
    expect(mockedRoute).toHaveBeenCalledWith('recipe_generation', 'premium');
  });

  it('recipe-ask mode: free tier stays free → DeepSeek route preserved', async () => {
    await aiRecipeService.generateFromDescription('grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    expect(mockedRoute).toHaveBeenCalledWith('recipe_generation', 'free');
  });

  it('recipe-ask mode: premium tier still routes to premium (no downgrade)', async () => {
    await aiRecipeService.generateFromDescription('grilled chicken', 'premium', {
      mode: 'recipe-ask',
    });
    expect(mockedRoute).toHaveBeenCalledWith('recipe_generation', 'premium');
  });

  it('recipe-ask mode: chef tier still routes to chef (no downgrade)', async () => {
    await aiRecipeService.generateFromDescription('grilled chicken', 'chef', {
      mode: 'recipe-ask',
    });
    expect(mockedRoute).toHaveBeenCalledWith('recipe_generation', 'chef');
  });

  it('recipe-ask mode rejects descriptions longer than 80 chars (structural guard)', async () => {
    // detectRecipeAsk only matches 2-5 word queries client-side, but the
    // backend can't trust the client — enforce a length cap so the
    // PII-bypass can never be exploited by a long free-text description.
    const longInput = 'grilled chicken '.repeat(20).trim();
    await expect(
      aiRecipeService.generateFromDescription(longInput, 'free', {
        mode: 'recipe-ask',
      }),
    ).rejects.toThrow(/too long for recipe-ask mode/i);
    // The PII bypass must NOT have been applied.
    expect(mockedRoute).not.toHaveBeenCalled();
    expect(mockedGen).not.toHaveBeenCalled();
  });
});
