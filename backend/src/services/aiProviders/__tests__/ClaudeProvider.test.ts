import type { RecipeGenerationRequest } from '../AIProvider';

// Mock @anthropic-ai/sdk before importing ClaudeProvider
const mockMessagesCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockMessagesCreate,
      },
    })),
  };
});

// Import after mock is set up
import { ClaudeProvider } from '../ClaudeProvider';

const MINIMAL_RECIPE_JSON = JSON.stringify({
  title: 'Test Chicken Bowl',
  description: 'A simple test recipe',
  cuisine: 'American',
  servings: 2,
  prepTime: 10,
  cookTime: 20,
  calories: 500,
  protein: 40,
  carbs: 30,
  fat: 15,
  ingredients: [{ name: 'chicken breast', amount: 200, unit: 'g' }],
  instructions: [{ step: 1, instruction: 'Cook the chicken.' }],
  tags: ['protein'],
  estimatedCost: 5,
  difficulty: 'easy',
});

const makeRequest = (overrides: Partial<RecipeGenerationRequest> = {}): RecipeGenerationRequest => ({
  prompt: 'Generate a healthy chicken bowl recipe',
  systemPrompt: 'You are a professional chef. Return valid JSON only.',
  temperature: 0.8,
  maxTokens: 4000,
  mealType: 'lunch',
  ...overrides,
});

const makeSuccessResponse = (text: string) => ({
  content: [{ type: 'text', text }],
});

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key-abc123';
    mockMessagesCreate.mockReset();
    provider = new ClaudeProvider();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('prompt caching — system block shape', () => {
    it('passes system prompt as an array with cache_control ephemeral', async () => {
      mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse(MINIMAL_RECIPE_JSON));
      const request = makeRequest();

      await provider.generateRecipe(request);

      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      const callArg = mockMessagesCreate.mock.calls[0][0];

      expect(Array.isArray(callArg.system)).toBe(true);
      expect(callArg.system).toHaveLength(1);
      expect(callArg.system[0]).toEqual({
        type: 'text',
        text: request.systemPrompt,
        cache_control: { type: 'ephemeral' },
      });
    });

    it('does NOT pass system as a plain string', async () => {
      mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse(MINIMAL_RECIPE_JSON));

      await provider.generateRecipe(makeRequest());

      const callArg = mockMessagesCreate.mock.calls[0][0];
      expect(typeof callArg.system).not.toBe('string');
    });

    it('preserves the exact system prompt text in the cache block', async () => {
      const customPrompt = 'Custom system prompt with special chars: & < > "';
      mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse(MINIMAL_RECIPE_JSON));

      await provider.generateRecipe(makeRequest({ systemPrompt: customPrompt }));

      const callArg = mockMessagesCreate.mock.calls[0][0];
      expect(callArg.system[0].text).toBe(customPrompt);
    });

    it('does NOT add cache_control to the user messages array', async () => {
      mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse(MINIMAL_RECIPE_JSON));
      const request = makeRequest();

      await provider.generateRecipe(request);

      const callArg = mockMessagesCreate.mock.calls[0][0];
      const userMessage = callArg.messages[0];
      expect(userMessage).not.toHaveProperty('cache_control');
      expect(typeof userMessage.content).toBe('string');
    });
  });

  describe('generateRecipe — core behavior', () => {
    it('returns the parsed recipe on success', async () => {
      mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse(MINIMAL_RECIPE_JSON));

      const result = await provider.generateRecipe(makeRequest());

      expect(result.title).toBe('Test Chicken Bowl');
      expect(result.protein).toBe(40);
    });

    it('clamps temperature to [0, 1] range', async () => {
      mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse(MINIMAL_RECIPE_JSON));

      // Default temperature 1.1 should be clamped to 1.0
      await provider.generateRecipe(makeRequest({ temperature: 1.5 }));

      const callArg = mockMessagesCreate.mock.calls[0][0];
      expect(callArg.temperature).toBe(1);
    });

    it('uses provided maxTokens or defaults to 4000', async () => {
      mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse(MINIMAL_RECIPE_JSON));

      await provider.generateRecipe(makeRequest({ maxTokens: 2000 }));

      const callArg = mockMessagesCreate.mock.calls[0][0];
      expect(callArg.max_tokens).toBe(2000);
    });

    it('passes the user prompt as the first messages entry', async () => {
      mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse(MINIMAL_RECIPE_JSON));
      const request = makeRequest();

      await provider.generateRecipe(request);

      const callArg = mockMessagesCreate.mock.calls[0][0];
      expect(callArg.messages).toHaveLength(1);
      expect(callArg.messages[0]).toEqual({ role: 'user', content: request.prompt });
    });

    it('extracts JSON from markdown code blocks', async () => {
      const wrappedJson = '```json\n' + MINIMAL_RECIPE_JSON + '\n```';
      mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse(wrappedJson));

      const result = await provider.generateRecipe(makeRequest());

      expect(result.title).toBe('Test Chicken Bowl');
    });

    it('throws a normalized error when the API call fails', async () => {
      const apiError = Object.assign(new Error('API rate limit'), { status: 429 });
      mockMessagesCreate.mockRejectedValueOnce(apiError);

      await expect(provider.generateRecipe(makeRequest())).rejects.toMatchObject({
        provider: 'Claude (Anthropic)',
        isQuotaError: true,
      });
    });

    it('throws when response content is not text type', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'toolu_01', name: 'foo', input: {} }],
      });

      await expect(provider.generateRecipe(makeRequest())).rejects.toThrow(
        'Unexpected response format from Claude'
      );
    });

    it('throws when JSON cannot be parsed from response', async () => {
      mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse('not valid json at all'));

      await expect(provider.generateRecipe(makeRequest())).rejects.toThrow(
        'Failed to parse Claude response as JSON'
      );
    });
  });

  describe('configuration', () => {
    it('is configured when ANTHROPIC_API_KEY is set', () => {
      expect(provider.isAvailable()).toBe(true);
    });

    it('throws when called without ANTHROPIC_API_KEY', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const unconfiguredProvider = new ClaudeProvider();

      await expect(unconfiguredProvider.generateRecipe(makeRequest())).rejects.toThrow(
        'Claude is not configured'
      );
    });
  });
});
