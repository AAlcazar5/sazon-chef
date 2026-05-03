// Group 10Y Phase 7: Coach write-tool SSE loop integration tests.
// Pro happy path: model emits compose_plate tool_use → server runs composer →
// emits tool_result → next iteration emits text → done.
// Free path: same loop, but tool_result carries PRO_FEATURE and the assistant
// text reply explains the gate without throwing an HTTP error.

const mockUserFindUnique = jest.fn();
const mockConversationFindFirst = jest.fn();
const mockMessageCreate = jest.fn();
const mockMessageCount = jest.fn();
const mockConversationUpdate = jest.fn();

const mockPantryFindMany = jest.fn();
const mockLeftoverFindMany = jest.fn();
const mockMacroGoalsFindUnique = jest.fn();
const mockMealFindMany = jest.fn();
const mockUserPreferencesFindUnique = jest.fn();
const mockSavedRecipeFindMany = jest.fn();
const mockCookingLogFindMany = jest.fn();
const mockRecipeFindMany = jest.fn();
const mockRecipeFindUnique = jest.fn();
const mockUserPhysicalProfileFindUnique = jest.fn();
const mockMealComponentFindMany = jest.fn();
const mockComposedPlateFindUnique = jest.fn();
const mockMealHistoryCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    coachConversation: {
      findFirst: (...a: unknown[]) => mockConversationFindFirst(...a),
      update: (...a: unknown[]) => mockConversationUpdate(...a),
    },
    coachMessage: {
      create: (...a: unknown[]) => mockMessageCreate(...a),
      count: (...a: unknown[]) => mockMessageCount(...a),
      aggregate: jest.fn().mockResolvedValue({
        _sum: { promptTokens: 0, cacheReadTokens: 0, completionTokens: 0 },
      }),
    },
    pantryItem: { findMany: (...a: unknown[]) => mockPantryFindMany(...a) },
    leftoverInventory: { findMany: (...a: unknown[]) => mockLeftoverFindMany(...a) },
    macroGoals: { findUnique: (...a: unknown[]) => mockMacroGoalsFindUnique(...a) },
    meal: { findMany: (...a: unknown[]) => mockMealFindMany(...a) },
    userPreferences: { findUnique: (...a: unknown[]) => mockUserPreferencesFindUnique(...a) },
    userPhysicalProfile: { findUnique: (...a: unknown[]) => mockUserPhysicalProfileFindUnique(...a) },
    savedRecipe: { findMany: (...a: unknown[]) => mockSavedRecipeFindMany(...a) },
    cookingLog: { findMany: (...a: unknown[]) => mockCookingLogFindMany(...a) },
    recipe: {
      findMany: (...a: unknown[]) => mockRecipeFindMany(...a),
      findUnique: (...a: unknown[]) => mockRecipeFindUnique(...a),
    },
    mealComponent: { findMany: (...a: unknown[]) => mockMealComponentFindMany(...a) },
    composedPlate: { findUnique: (...a: unknown[]) => mockComposedPlateFindUnique(...a) },
    mealHistory: { create: (...a: unknown[]) => mockMealHistoryCreate(...a) },
  },
}));

const mockSaveComposedPlate = jest.fn();
jest.mock('@/services/mealComponentService', () => ({
  saveComposedPlate: (...a: unknown[]) => mockSaveComposedPlate(...a),
  COMPONENT_SLOTS: ['protein', 'base', 'vegetable', 'sauce', 'garnish'] as const,
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

const mockStream = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { stream: (...a: unknown[]) => mockStream(...a) },
    })),
  };
});

import express from 'express';
import request from 'supertest';
import { coachRoutes } from '../../src/modules/coach/coachRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/coach', coachRoutes);
  return app;
}

function fakeToolUseStream(toolName: string, toolInput: object, toolUseId: string) {
  async function* iterate() {
    yield {
      type: 'content_block_start',
      index: 0,
      content_block: {
        type: 'tool_use',
        id: toolUseId,
        name: toolName,
        input: toolInput,
      },
    };
    yield { type: 'content_block_stop', index: 0 };
  }
  return {
    [Symbol.asyncIterator]: () => iterate(),
    finalMessage: jest.fn().mockResolvedValue({
      content: [
        { type: 'tool_use', id: toolUseId, name: toolName, input: toolInput },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 30,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
      model: 'claude-opus-4-7',
      stop_reason: 'tool_use',
    }),
  };
}

function fakeTextStream(text: string) {
  async function* iterate() {
    yield {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text },
    };
  }
  return {
    [Symbol.asyncIterator]: () => iterate(),
    finalMessage: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text }],
      usage: {
        input_tokens: 50,
        output_tokens: 10,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
      model: 'claude-opus-4-7',
      stop_reason: 'end_turn',
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  mockPantryFindMany.mockResolvedValue([]);
  mockLeftoverFindMany.mockResolvedValue([]);
  mockMacroGoalsFindUnique.mockResolvedValue(null);
  mockMealFindMany.mockResolvedValue([]);
  mockUserPreferencesFindUnique.mockResolvedValue(null);
  mockUserPhysicalProfileFindUnique.mockResolvedValue(null);
  mockSavedRecipeFindMany.mockResolvedValue([]);
  mockCookingLogFindMany.mockResolvedValue([]);
  mockMessageCount.mockResolvedValue(0);
  mockMessageCreate.mockImplementation(({ data }) =>
    Promise.resolve({ ...data, id: 'm-new' }),
  );
  mockConversationUpdate.mockResolvedValue({});
  mockMealComponentFindMany.mockResolvedValue([
    {
      id: 'c1',
      slot: 'protein',
      name: 'Grilled Chicken',
      pantryIngredientNames: '["chicken thigh"]',
      cuisineTags: '[]',
      dietaryTags: '[]',
    },
  ]);
});

describe('POST /api/coach/message — write tool SSE loop (Pro)', () => {
  it('runs compose_plate, emits SSE order tool_use → tool_result → text → done', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-pro',
      subscriptionTier: 'premium',
      subscriptionStatus: 'active',
    });
    mockConversationFindFirst.mockResolvedValue({
      id: 'c1',
      userId: 'user-pro',
      title: 't1',
      tier: 'premium',
    });
    mockSaveComposedPlate.mockResolvedValue({
      plate: {
        id: 'plate-1',
        totalCalories: 520,
        totalProtein: 42,
        totalCarbs: 38,
        totalFat: 18,
        pantryCoveragePercent: 80,
      },
    });

    mockStream
      .mockReturnValueOnce(
        fakeToolUseStream(
          'compose_plate',
          { slots: [{ slot: 'protein', componentId: 'c1' }], servings: 1 },
          'tu_1',
        ),
      )
      .mockReturnValueOnce(fakeTextStream('Saved your plate.'));

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-pro')
      .send({ conversationId: 'c1', message: 'compose this plate now' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('event: tool_use');
    expect(res.text).toContain('event: tool_result');
    expect(res.text).toContain('Saved your plate.');
    expect(res.text).toContain('event: done');

    // SSE event order: tool_use must precede tool_result must precede done.
    const usePos = res.text.indexOf('event: tool_use');
    const resultPos = res.text.indexOf('event: tool_result');
    const donePos = res.text.indexOf('event: done');
    expect(usePos).toBeGreaterThanOrEqual(0);
    expect(resultPos).toBeGreaterThan(usePos);
    expect(donePos).toBeGreaterThan(resultPos);

    expect(mockSaveComposedPlate).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/coach/message — write tool SSE loop (Free)', () => {
  it('free user gets PRO_FEATURE in tool_result, not an HTTP error', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-free',
      subscriptionTier: 'free',
      subscriptionStatus: 'free',
    });
    mockConversationFindFirst.mockResolvedValue({
      id: 'c1',
      userId: 'user-free',
      title: 't1',
      tier: 'free',
    });

    mockStream
      .mockReturnValueOnce(
        fakeToolUseStream(
          'log_meal',
          { recipeId: 'r1', servings: 1, mealType: 'dinner' },
          'tu_1',
        ),
      )
      .mockReturnValueOnce(
        fakeTextStream("That's a Pro feature — upgrade to log meals."),
      );

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'c1', message: 'log my meal' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: tool_result');
    expect(res.text).toContain('PRO_FEATURE');
    expect(res.text).toContain('write_tools');
    expect(res.text).toContain('event: done');
    // The composer/meal-history must never run for a free user.
    expect(mockSaveComposedPlate).not.toHaveBeenCalled();
    expect(mockMealHistoryCreate).not.toHaveBeenCalled();
  });
});
