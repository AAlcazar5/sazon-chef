// Group 10Y Phase 3: Coach route tool-use loop integration test.
// Mocks Anthropic SDK to return tool_use → tool_result → text → done flow.

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
const mockUserPhysicalProfileFindUnique = jest.fn();

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
    },
    pantryItem: { findMany: (...a: unknown[]) => mockPantryFindMany(...a) },
    leftoverInventory: { findMany: (...a: unknown[]) => mockLeftoverFindMany(...a) },
    macroGoals: { findUnique: (...a: unknown[]) => mockMacroGoalsFindUnique(...a) },
    meal: { findMany: (...a: unknown[]) => mockMealFindMany(...a) },
    userPreferences: { findUnique: (...a: unknown[]) => mockUserPreferencesFindUnique(...a) },
    userPhysicalProfile: { findUnique: (...a: unknown[]) => mockUserPhysicalProfileFindUnique(...a) },
    savedRecipe: { findMany: (...a: unknown[]) => mockSavedRecipeFindMany(...a) },
    cookingLog: { findMany: (...a: unknown[]) => mockCookingLogFindMany(...a) },
    recipe: { findMany: (...a: unknown[]) => mockRecipeFindMany(...a) },
  },
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

// First-call stream: emits a tool_use block.
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
        {
          type: 'tool_use',
          id: toolUseId,
          name: toolName,
          input: toolInput,
        },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 30,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
      model: 'claude-sonnet-4-6',
      stop_reason: 'tool_use',
    }),
  };
}

// Second-call stream: emits text only.
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
      model: 'claude-sonnet-4-6',
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
});

describe('POST /api/coach/message — tool-use loop', () => {
  it('runs find_recipes tool, emits SSE tool events, persists single assistant message with toolUses', async () => {
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
    mockMessageCreate.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: 'm-new' }),
    );

    const fakeRecipe = {
      id: 'r1',
      title: 'Mediterranean Chicken Bowl',
      description: 'Lemon-herb chicken',
      cookTime: 25,
      cuisine: 'Mediterranean',
      calories: 520,
      protein: 42,
      carbs: 38,
      fat: 18,
      fiber: 6,
      sugar: 4,
      ingredients: [{ text: 'chicken' }, { text: 'lemon' }],
      instructions: [{ text: 'cook' }],
    };
    const fakeRecipe2 = { ...fakeRecipe, id: 'r2', title: 'Greek Salad', cuisine: 'Greek' };
    mockRecipeFindMany.mockResolvedValue([fakeRecipe, fakeRecipe2]);

    // First Anthropic call: tool_use; second: text
    mockStream
      .mockReturnValueOnce(fakeToolUseStream('find_recipes', { cuisines: ['Mediterranean'] }, 'tu_1'))
      .mockReturnValueOnce(fakeTextStream('Here are 2 picks'));

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'c1', message: 'find me dinner' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('event: tool_use');
    expect(res.text).toContain('event: tool_result');
    expect(res.text).toContain('Here are 2 picks');
    expect(res.text).toContain('event: done');

    // Two stream invocations: first for tool_use, second for follow-up text
    expect(mockStream).toHaveBeenCalledTimes(2);

    // user message + exactly one assistant message persisted
    const assistantCalls = mockMessageCreate.mock.calls.filter(
      ([arg]) => (arg as { data: { role: string } }).data.role === 'assistant',
    );
    expect(assistantCalls).toHaveLength(1);

    const assistantData = (assistantCalls[0][0] as { data: { attachments: string } }).data;
    const attachments = JSON.parse(assistantData.attachments);
    expect(Array.isArray(attachments.toolUses)).toBe(true);
    expect(attachments.toolUses).toHaveLength(1);
    expect(attachments.toolUses[0].name).toBe('find_recipes');
    expect(attachments.toolUses[0].result).toBeDefined();
  });

  it('caps tool-use loop at 5 iterations to prevent runaway', async () => {
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
    mockMessageCreate.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: 'm-new' }),
    );
    mockRecipeFindMany.mockResolvedValue([]);

    // Always emit a tool_use — would loop forever without the cap.
    mockStream.mockImplementation(() =>
      fakeToolUseStream('get_pantry', {}, `tu_${mockStream.mock.calls.length}`),
    );

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'c1', message: 'loop' });

    expect(res.status).toBe(200);
    expect(mockStream.mock.calls.length).toBeLessThanOrEqual(5);
  });
});
