// backend/__tests__/services/macroEstimationService.test.ts
// Group 10X Phase 10 — macro estimation for custom Build-a-Plate items.
// USDA FoodData Central first; LLM fallback via Anthropic SDK.

const mockAnthropicCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: (...a: unknown[]) => mockAnthropicCreate(...a) },
  })),
}));

const ORIGINAL_FETCH = global.fetch;

const usdaResponse = (foods: Array<Record<string, unknown>>) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ foods }),
  }) as unknown as Response;

const usdaFood = (overrides: Partial<Record<string, unknown>> = {}) => ({
  fdcId: 1,
  description: 'Avocado, raw',
  dataType: 'Foundation',
  foodNutrients: [
    { nutrientName: 'Energy', value: 160 },
    { nutrientName: 'Protein', value: 2 },
    { nutrientName: 'Carbohydrate, by difference', value: 8.5 },
    { nutrientName: 'Total lipid (fat)', value: 14.7 },
    { nutrientName: 'Fiber, total dietary', value: 6.7 },
  ],
  ...overrides,
});

const llmResponse = (json: Record<string, unknown>) => ({
  content: [{ type: 'text', text: JSON.stringify(json) }],
});

beforeEach(() => {
  jest.resetModules();
  mockAnthropicCreate.mockReset();
  global.fetch = jest.fn();
  process.env.FDC_API_KEY = 'test-fdc-key';
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
});

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});

const loadService = () => require('../../src/services/macroEstimationService');

describe('macroEstimationService — USDA path', () => {
  it('returns scaled per-portion macros for a USDA hit', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(usdaResponse([usdaFood()]));

    const { estimateMacros } = loadService();
    const result = await estimateMacros({
      name: 'avocado',
      slot: 'garnish',
      portionGrams: 100,
    });

    expect(result.source).toBe('usda');
    expect(result.confidence).toBe('high');
    expect(result.caloriesPerPortion).toBe(160);
    expect(result.proteinG).toBe(2);
    expect(result.fatG).toBeCloseTo(14.7, 1);
    expect(result.fiberG).toBeCloseTo(6.7, 1);
    expect(result.matchedName).toBe('Avocado, raw');
    expect(mockAnthropicCreate).not.toHaveBeenCalled();
  });

  it('scales linearly with portion grams', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(usdaResponse([usdaFood()]));

    const { estimateMacros } = loadService();
    const result = await estimateMacros({
      name: 'avocado',
      slot: 'garnish',
      portionGrams: 200,
    });

    expect(result.caloriesPerPortion).toBeCloseTo(320, 1);
    expect(result.proteinG).toBeCloseTo(4, 1);
    expect(result.fatG).toBeCloseTo(29.4, 1);
  });

  it('falls through to LLM when USDA top match is below the 0.7 fuzzy threshold', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      usdaResponse([usdaFood({ description: 'Cheese, queso fresco, Mexican-style, dehydrated' })]),
    );
    mockAnthropicCreate.mockResolvedValueOnce(
      llmResponse({
        caloriesPerPortion: 250,
        proteinG: 30,
        carbsG: 5,
        fatG: 12,
        fiberG: 0,
      }),
    );

    const { estimateMacros } = loadService();
    const result = await estimateMacros({
      name: "nani's biryani",
      slot: 'protein',
      portionGrams: 200,
    });

    expect(result.source).toBe('ai');
    expect(result.confidence).toBe('estimated');
    expect(result.caloriesPerPortion).toBe(250);
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
  });

  it('falls through to LLM when USDA returns no foods', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(usdaResponse([]));
    mockAnthropicCreate.mockResolvedValueOnce(
      llmResponse({
        caloriesPerPortion: 100,
        proteinG: 5,
        carbsG: 10,
        fatG: 4,
        fiberG: 2,
      }),
    );

    const { estimateMacros } = loadService();
    const result = await estimateMacros({
      name: 'unicorn stew',
      slot: 'protein',
      portionGrams: 100,
    });

    expect(result.source).toBe('ai');
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
  });
});

describe('macroEstimationService — LLM bounds + fallback', () => {
  it('returns fallback (zeros) when LLM produces out-of-bounds calories', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(usdaResponse([]));
    mockAnthropicCreate.mockResolvedValueOnce(
      llmResponse({
        caloriesPerPortion: 9000, // wildly out of bounds
        proteinG: 30,
        carbsG: 5,
        fatG: 12,
        fiberG: 0,
      }),
    );

    const { estimateMacros } = loadService();
    const result = await estimateMacros({
      name: 'unicorn stew',
      slot: 'protein',
      portionGrams: 100,
    });

    expect(result.source).toBe('fallback');
    expect(result.confidence).toBe('unknown');
    expect(result.caloriesPerPortion).toBe(0);
    expect(result.proteinG).toBe(0);
  });

  it('returns fallback when LLM JSON is malformed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(usdaResponse([]));
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not json at all' }],
    });

    const { estimateMacros } = loadService();
    const result = await estimateMacros({
      name: 'unicorn stew',
      slot: 'protein',
      portionGrams: 100,
    });

    expect(result.source).toBe('fallback');
    expect(result.caloriesPerPortion).toBe(0);
  });

  it('returns fallback when neither USDA nor Anthropic are configured', async () => {
    delete process.env.FDC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const { estimateMacros } = loadService();
    const result = await estimateMacros({
      name: 'avocado',
      slot: 'garnish',
      portionGrams: 100,
    });

    expect(result.source).toBe('fallback');
    expect(result.caloriesPerPortion).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockAnthropicCreate).not.toHaveBeenCalled();
  });
});

describe('macroEstimationService — cache', () => {
  it('serves cached result on repeat query within TTL', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(usdaResponse([usdaFood()]));

    const { estimateMacros } = loadService();
    const a = await estimateMacros({ name: 'avocado', slot: 'garnish', portionGrams: 100 });
    const b = await estimateMacros({ name: 'avocado', slot: 'garnish', portionGrams: 100 });

    expect(a.caloriesPerPortion).toBe(b.caloriesPerPortion);
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);
  });

  it('cache key includes portionGrams (different portions hit USDA again)', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(usdaResponse([usdaFood()]))
      .mockResolvedValueOnce(usdaResponse([usdaFood()]));

    const { estimateMacros } = loadService();
    await estimateMacros({ name: 'avocado', slot: 'garnish', portionGrams: 100 });
    await estimateMacros({ name: 'avocado', slot: 'garnish', portionGrams: 200 });

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(2);
  });
});
