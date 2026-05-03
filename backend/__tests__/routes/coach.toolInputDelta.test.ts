// Group 10Y TS#1: when Anthropic streams a tool_use, content_block_start
// always carries `input: {}` per the streaming protocol. The real input
// arrives via input_json_delta and is assembled on `final.content`. The
// route must dispatch tools with the populated input — not the empty {}.

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
const mockUserPhysicalProfileFindUnique = jest.fn();
const mockCookingLogFindMany = jest.fn();

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
    cookingLog: { findMany: (...a: unknown[]) => mockCookingLogFindMany(...a) },
  },
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

const mockStream = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { stream: (...a: unknown[]) => mockStream(...a) },
  })),
}));

const mockRunCoachTool = jest.fn();
jest.mock('@/services/coachTools', () => {
  const actual = jest.requireActual('@/services/coachTools');
  return {
    ...actual,
    runCoachTool: (...a: unknown[]) => mockRunCoachTool(...a),
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

// Mimic the real Anthropic streaming protocol: content_block_start carries
// `input: {}` (deltas haven't been applied yet); the populated input only
// becomes available on `final.content`.
function streamingProtocolFakeStream(
  toolName: string,
  toolUseId: string,
  populatedInput: object,
) {
  async function* iterate() {
    yield {
      type: 'content_block_start',
      index: 0,
      content_block: {
        type: 'tool_use',
        id: toolUseId,
        name: toolName,
        input: {}, // ← always empty per Anthropic streaming spec
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
          input: populatedInput, // ← real input lives here
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
  mockCookingLogFindMany.mockResolvedValue([]);
  mockMessageCount.mockResolvedValue(0);
});

describe('POST /api/coach/message — tool input is populated from final.content', () => {
  it('dispatches the tool with populated input even though stream events deliver {}', async () => {
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
    mockMessageCreate.mockImplementation(({ data }: { data: unknown }) =>
      Promise.resolve({ ...(data as object), id: 'm-new' }),
    );
    mockRunCoachTool.mockResolvedValue({ result: { recipes: [] } });

    const populatedInput = {
      cuisines: ['Mediterranean'],
      maxPrepMinutes: 30,
      minProtein: 35,
    };

    mockStream
      .mockReturnValueOnce(
        streamingProtocolFakeStream('find_recipes', 'tu_1', populatedInput),
      )
      .mockReturnValueOnce(fakeTextStream('Two picks for you'));

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'c1', message: 'find dinner' });

    expect(res.status).toBe(200);
    expect(mockRunCoachTool).toHaveBeenCalledTimes(1);
    const dispatchedArg = mockRunCoachTool.mock.calls[0][0];
    expect(dispatchedArg.name).toBe('find_recipes');
    // The bug: dispatchedArg.input would be {} — verify we receive the real one.
    expect(dispatchedArg.input).toEqual(populatedInput);

    // The persisted assistant message must record the populated input too.
    const assistantCall = mockMessageCreate.mock.calls.find(
      ([arg]) => (arg as { data: { role: string } }).data.role === 'assistant',
    );
    expect(assistantCall).toBeDefined();
    const attachments = JSON.parse(
      (assistantCall![0] as { data: { attachments: string } }).data.attachments,
    );
    expect(attachments.toolUses[0].input).toEqual(populatedInput);
  });
});
