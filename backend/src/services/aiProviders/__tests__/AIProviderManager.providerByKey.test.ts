// Founder report 2026-05-20: every recipe-ask hits quota because only
// Claude is tried, even though the route returns
// `providerOrder: ['deepseek', 'claude']`. Root cause: the constructor
// only adds providers listed in `AI_PROVIDER_ORDER` (defaulted to
// claude/gemini) to `providersByKey`. So when a per-request providerOrder
// includes `deepseek`, the resolver silently skips it (no instance in
// the map) and only Claude is in the chain.
//
// Fix: `providersByKey` must hold EVERY available provider, regardless of
// the default chain order. The default chain (`this.providers`) still
// honors AI_PROVIDER_ORDER for Path A callers; per-request overrides
// (Path B) can pick from the full available set.

import { AIProviderManager } from '../AIProviderManager';
import type { AIProvider } from '../AIProvider';

const mockClaude = {
  getName: () => 'Claude (Anthropic)',
  isAvailable: () => true,
  normalizeError: jest.fn((e: any) => ({
    provider: 'Claude (Anthropic)',
    code: 'error',
    status: 500,
    message: e.message,
    isQuotaError: false,
    isRateLimitError: false,
    retryable: false,
  })),
  generateRecipe: jest.fn(),
};
const mockGemini = {
  getName: () => 'Gemini (Google)',
  isAvailable: () => false,
  normalizeError: jest.fn(),
  generateRecipe: jest.fn(),
};
const mockDeepseek = {
  getName: () => 'DeepSeek-V3',
  isAvailable: () => true,
  normalizeError: jest.fn(),
  generateRecipe: jest.fn().mockResolvedValue({
    title: 'Grilled Chicken',
    description: 'Simple grilled chicken.',
    cuisine: 'American',
    mealType: 'dinner',
    cookTime: 20,
    difficulty: 'easy',
    servings: 2,
    calories: 400,
    protein: 35,
    carbs: 10,
    fat: 20,
    fiber: 2,
    ingredients: [
      { name: 'chicken', amount: 1, unit: 'lb' },
      { name: 'olive oil', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      { step: 1, instruction: 'Grill.' },
      { step: 2, instruction: 'Rest.' },
    ],
    tips: [],
    tags: [],
  }),
};
const mockGroq = {
  getName: () => 'Groq (Llama 3.3 70B)',
  isAvailable: () => false,
  normalizeError: jest.fn(),
  generateRecipe: jest.fn(),
};

jest.mock('../ClaudeProvider', () => ({
  ClaudeProvider: jest.fn().mockImplementation(() => mockClaude),
}));
jest.mock('../GeminiProvider', () => ({
  GeminiProvider: jest.fn().mockImplementation(() => mockGemini),
}));
jest.mock('../OllamaProvider', () => ({
  OllamaProvider: jest.fn().mockImplementation(() => ({
    getName: () => 'Ollama',
    isAvailable: () => false,
    normalizeError: jest.fn(),
    generateRecipe: jest.fn(),
  })),
}));
// OpenAICompatProvider — three named slots (groq / deepseek / generic).
// Match by the label in the constructor options to return the right mock.
jest.mock('../OpenAICompatProvider', () => ({
  OpenAICompatProvider: jest.fn().mockImplementation((opts?: { label?: string }) => {
    if (opts?.label?.includes('DeepSeek')) return mockDeepseek;
    if (opts?.label?.includes('Groq')) return mockGroq;
    return {
      getName: () => 'OpenAI-Compat',
      isAvailable: () => false,
      normalizeError: jest.fn(),
      generateRecipe: jest.fn(),
    };
  }),
}));

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.DEEPSEEK_API_KEY = 'test-key';
  mockDeepseek.generateRecipe.mockClear();
  mockClaude.generateRecipe.mockClear();
});

afterEach(() => {
  delete process.env.AI_PROVIDER_ORDER;
});

describe('AIProviderManager — per-request providerOrder resolves to available providers', () => {
  it('resolves deepseek when default order is claude/gemini (founder bug 2026-05-20)', async () => {
    // AI_PROVIDER_ORDER unset → default = ['claude', 'gemini']. DeepSeek
    // is NOT in the default chain. But Path B routes (recipe_generation
    // free) request providerOrder: ['deepseek', 'claude']. That MUST work.
    const manager = new AIProviderManager();
    const result = await manager.generateRecipe({
      prompt: 'p',
      systemPrompt: 's',
      providerOrder: ['deepseek', 'claude'],
    } as any);
    expect(result.title).toBe('Grilled Chicken');
    expect(mockDeepseek.generateRecipe).toHaveBeenCalledTimes(1);
    expect(mockClaude.generateRecipe).not.toHaveBeenCalled();
  });

  it('falls back to claude when deepseek throws a non-quota error', async () => {
    const manager = new AIProviderManager();
    mockDeepseek.generateRecipe.mockRejectedValueOnce(
      Object.assign(new Error('deepseek down'), {
        isQuotaError: false,
        retryable: true,
        provider: 'DeepSeek-V3',
      }),
    );
    mockClaude.generateRecipe.mockResolvedValueOnce({
      title: 'Fallback Chicken',
      description: 'From Claude.',
      cuisine: 'American',
      mealType: 'dinner',
      cookTime: 20,
      difficulty: 'easy',
      servings: 2,
      calories: 400,
      protein: 35,
      carbs: 10,
      fat: 20,
      fiber: 2,
      ingredients: [
        { name: 'chicken', amount: 1, unit: 'lb' },
        { name: 'olive oil', amount: 2, unit: 'tbsp' },
      ],
      instructions: [
        { step: 1, instruction: 'Grill.' },
        { step: 2, instruction: 'Rest.' },
      ],
      tips: [],
      tags: [],
    });
    const result = await manager.generateRecipe({
      prompt: 'p',
      systemPrompt: 's',
      providerOrder: ['deepseek', 'claude'],
    } as any);
    expect(result.title).toBe('Fallback Chicken');
    expect(mockDeepseek.generateRecipe).toHaveBeenCalledTimes(1);
    expect(mockClaude.generateRecipe).toHaveBeenCalledTimes(1);
  });
});
