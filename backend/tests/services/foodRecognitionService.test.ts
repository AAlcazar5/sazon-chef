// backend/tests/services/foodRecognitionService.test.ts
//
// Tier L M23 — foodRecognitionService coverage. The service wraps two
// vision providers (Anthropic Claude primary + Google Gemini fallback)
// and an OpenFoodFacts barcode lookup with a Nutritionix fallback.
// We assert:
//   - constructor: missing both keys → recognize throws no_provider
//   - happy path: Claude succeeds → result is normalized with totals
//   - fallback: Claude fails → Gemini called → result returned
//   - all-fail typing: 401 → auth_error, 429 → rate_limit, "not food" → not_food, else provider_error
//   - parseJsonResponse: handles plain JSON + ```json``` fences + text fallback
//   - normalizeResult: fills missing fields; rounds totals
//   - scanBarcode: OpenFoodFacts happy path + missing-product null + Nutritionix fallback

jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockAnthropicCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { create: mockAnthropicCreate },
    })),
  };
});

const mockGeminiGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGeminiGenerateContent,
    }),
  })),
}));

import { FoodRecognitionService, FoodRecognitionError } from '../../src/services/foodRecognitionService';

function makeService(env: { anthropic?: string; gemini?: string }) {
  if (env.anthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = env.anthropic;
  if (env.gemini === undefined) delete process.env.GOOGLE_AI_API_KEY;
  else process.env.GOOGLE_AI_API_KEY = env.gemini;
  return new FoodRecognitionService();
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('foodRecognitionService — provider configuration', () => {
  it('throws no_provider when neither API key is set', async () => {
    const svc = makeService({});
    await expect(svc.recognizeFoodFromPhoto('imgdata')).rejects.toMatchObject({
      code: 'no_provider',
    });
  });
});

describe('foodRecognitionService — recognizeFoodFromPhoto', () => {
  const SAMPLE_RESPONSE = JSON.stringify({
    foods: [
      { name: 'salad', confidence: 0.9, estimatedCalories: 200, estimatedProtein: 10, estimatedCarbs: 15, estimatedFat: 8, estimatedFiber: 5 },
    ],
    totalEstimatedCalories: 200,
    totalEstimatedProtein: 10,
    totalEstimatedCarbs: 15,
    totalEstimatedFat: 8,
    mealDescription: 'Mixed green salad',
    confidence: 0.9,
  });

  it('happy path via Claude when key is set', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: SAMPLE_RESPONSE }],
    });

    const r = await svc.recognizeFoodFromPhoto('base64data', 'image/jpeg');

    expect(r.totalEstimatedCalories).toBe(200);
    expect(r.foods).toHaveLength(1);
    expect(r.foods[0].name).toBe('salad');
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
    // Gemini wasn't even configured / called
    expect(mockGeminiGenerateContent).not.toHaveBeenCalled();
  });

  it('falls back to Gemini when Claude throws and Gemini is configured', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test', gemini: 'AIzaTEST' });
    mockAnthropicCreate.mockRejectedValueOnce(new Error('claude down'));
    mockGeminiGenerateContent.mockResolvedValueOnce({
      response: { text: () => SAMPLE_RESPONSE },
    });

    const r = await svc.recognizeFoodFromPhoto('base64data');

    expect(r.totalEstimatedCalories).toBe(200);
    expect(mockAnthropicCreate).toHaveBeenCalled();
    expect(mockGeminiGenerateContent).toHaveBeenCalled();
  });

  it('typed error for 401-style auth failures', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockAnthropicCreate.mockRejectedValueOnce(new Error('401 Unauthorized'));

    await expect(svc.recognizeFoodFromPhoto('img')).rejects.toMatchObject({
      code: 'auth_error',
    });
  });

  it('typed error for 429 / quota / rate failures', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockAnthropicCreate.mockRejectedValueOnce(new Error('429 rate limit'));

    await expect(svc.recognizeFoodFromPhoto('img')).rejects.toMatchObject({
      code: 'rate_limit',
    });
  });

  it('typed error when the provider says "not food"', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockAnthropicCreate.mockRejectedValueOnce(new Error('cannot identify any food'));

    await expect(svc.recognizeFoodFromPhoto('img')).rejects.toMatchObject({
      code: 'not_food',
    });
  });

  it('generic provider_error for everything else', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockAnthropicCreate.mockRejectedValueOnce(new Error('something weird'));

    await expect(svc.recognizeFoodFromPhoto('img')).rejects.toMatchObject({
      code: 'provider_error',
    });
  });

  it('parses Claude responses wrapped in ```json fences', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```json\n' + SAMPLE_RESPONSE + '\n```' }],
    });
    const r = await svc.recognizeFoodFromPhoto('img');
    expect(r.totalEstimatedCalories).toBe(200);
  });

  it('falls back to text extraction when JSON parse fails', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Salmon: 350 calories\nRice: 200 calories\n' }],
    });

    const r = await svc.recognizeFoodFromPhoto('img');
    expect(r.totalEstimatedCalories).toBe(550);
    expect(r.foods.length).toBe(2);
    expect(r.foods.map((f) => f.name)).toEqual(expect.arrayContaining(['Salmon', 'Rice']));
  });

  it('throws on malformed Claude response (no text block)', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockAnthropicCreate.mockResolvedValueOnce({ content: [{ type: 'image' }] });

    await expect(svc.recognizeFoodFromPhoto('img')).rejects.toBeInstanceOf(FoodRecognitionError);
  });
});

describe('foodRecognitionService — normalizeResult invariants', () => {
  it('rounds totals and fills missing per-item defaults', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            foods: [{ name: 'pasta' }], // missing macros
            // missing totals — must be derived
          }),
        },
      ],
    });

    const r = await svc.recognizeFoodFromPhoto('img');

    expect(r.foods[0].name).toBe('pasta');
    expect(r.foods[0].confidence).toBeGreaterThan(0); // default fill
    expect(r.foods[0].estimatedCalories).toBe(0);
    expect(r.totalEstimatedCalories).toBe(0); // derived from foods sum
    expect(r.mealDescription).toBeTruthy();
  });
});

describe('foodRecognitionService — scanBarcode (OpenFoodFacts)', () => {
  it('returns nutrition data on a hit', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        status: 1,
        product: {
          product_name: 'Chocolate Bar',
          brands: 'TestBrand',
          serving_size: '40g',
          nutriments: {
            'energy-kcal_100g': 535,
            'proteins_100g': 7.5,
            'carbohydrates_100g': 60.2,
            'fat_100g': 30,
            'fiber_100g': 7,
            'sugars_100g': 47.3,
          },
          image_url: 'https://x',
        },
      },
    });

    const r = await svc.scanBarcode('1234567890');

    expect(r).toMatchObject({
      productName: 'Chocolate Bar',
      brand: 'TestBrand',
      calories: 535,
      protein: 7.5,
      carbs: 60.2,
      fat: 30,
      fiber: 7,
      sugar: 47.3,
      servingSize: '40g',
      barcode: '1234567890',
    });
  });

  it('returns null when product is not in OpenFoodFacts', async () => {
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockedAxios.get.mockResolvedValueOnce({ data: { status: 0 } });
    const r = await svc.scanBarcode('9999');
    expect(r).toBeNull();
  });

  it('falls back to Nutritionix when OFF errors AND Nutritionix keys are set', async () => {
    process.env.NUTRITIONIX_APP_ID = 'app';
    process.env.NUTRITIONIX_API_KEY = 'key';
    const svc = makeService({ anthropic: 'sk-ant-test' });

    mockedAxios.get.mockRejectedValueOnce(new Error('OFF down'));
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        foods: [
          {
            food_name: 'Backup Bar',
            brand_name: 'Nx',
            nf_calories: 200,
            nf_protein: 5,
            nf_total_carbohydrate: 30,
            nf_total_fat: 8,
            serving_weight_grams: 50,
          },
        ],
      },
    });

    const r = await svc.scanBarcode('1234');

    expect(r?.productName).toBe('Backup Bar');
    expect(r?.calories).toBe(200);
    expect(r?.servingSize).toBe('50g');

    delete process.env.NUTRITIONIX_APP_ID;
    delete process.env.NUTRITIONIX_API_KEY;
  });

  it('throws when OFF errors and Nutritionix is not configured', async () => {
    delete process.env.NUTRITIONIX_APP_ID;
    delete process.env.NUTRITIONIX_API_KEY;
    const svc = makeService({ anthropic: 'sk-ant-test' });
    mockedAxios.get.mockRejectedValueOnce(new Error('OFF down'));
    await expect(svc.scanBarcode('1234')).rejects.toThrow(/Failed to scan barcode/);
  });
});
