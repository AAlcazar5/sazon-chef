// Group 10Y-A: Coach route integration — SSE streaming + conversation CRUD +
// daily cap. Anthropic SDK is mocked so the streaming bytes are deterministic.

const mockUserFindUnique = jest.fn();
const mockConversationCreate = jest.fn();
const mockConversationFindMany = jest.fn();
const mockConversationFindFirst = jest.fn();
const mockConversationFindUnique = jest.fn();
const mockConversationUpdate = jest.fn();
const mockMessageCreate = jest.fn();
const mockMessageFindMany = jest.fn();
const mockMessageCount = jest.fn();

const mockPantryFindMany = jest.fn();
const mockLeftoverFindMany = jest.fn();
const mockSlotAffinityFindMany = jest.fn();
const mockPairAffinityFindMany = jest.fn();
const mockMacroGoalsFindUnique = jest.fn();
const mockMealHistoryFindMany = jest.fn();
const mockMealFindMany = jest.fn();
const mockUserPreferencesFindUnique = jest.fn();
const mockUserPhysicalProfileFindUnique = jest.fn();
const mockMealPlanFindFirst = jest.fn();
const mockCookingLogFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    coachConversation: {
      create: (...a: unknown[]) => mockConversationCreate(...a),
      findMany: (...a: unknown[]) => mockConversationFindMany(...a),
      findFirst: (...a: unknown[]) => mockConversationFindFirst(...a),
      findUnique: (...a: unknown[]) => mockConversationFindUnique(...a),
      update: (...a: unknown[]) => mockConversationUpdate(...a),
    },
    coachMessage: {
      create: (...a: unknown[]) => mockMessageCreate(...a),
      findMany: (...a: unknown[]) => mockMessageFindMany(...a),
      count: (...a: unknown[]) => mockMessageCount(...a),
      aggregate: jest.fn().mockResolvedValue({
        _sum: { promptTokens: 0, cacheReadTokens: 0, completionTokens: 0 },
      }),
    },
    pantryItem: { findMany: (...a: unknown[]) => mockPantryFindMany(...a) },
    leftoverInventory: {
      findMany: (...a: unknown[]) => mockLeftoverFindMany(...a),
    },
    slotAffinity: {
      findMany: (...a: unknown[]) => mockSlotAffinityFindMany(...a),
    },
    pairAffinity: {
      findMany: (...a: unknown[]) => mockPairAffinityFindMany(...a),
    },
    macroGoals: {
      findUnique: (...a: unknown[]) => mockMacroGoalsFindUnique(...a),
    },
    mealHistory: {
      findMany: (...a: unknown[]) => mockMealHistoryFindMany(...a),
    },
    meal: { findMany: (...a: unknown[]) => mockMealFindMany(...a) },
    userPreferences: {
      findUnique: (...a: unknown[]) => mockUserPreferencesFindUnique(...a),
    },
    userPhysicalProfile: {
      findUnique: (...a: unknown[]) => mockUserPhysicalProfileFindUnique(...a),
    },
    mealPlan: { findFirst: (...a: unknown[]) => mockMealPlanFindFirst(...a) },
    cookingLog: {
      findMany: (...a: unknown[]) => mockCookingLogFindMany(...a),
    },
  },
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

// Mock Anthropic SDK so we can deterministically yield stream events
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

const FREE_USER = {
  id: 'user-free',
  subscriptionTier: 'free',
  subscriptionStatus: 'free',
};
const PREMIUM_USER = {
  id: 'user-pro',
  subscriptionTier: 'premium',
  subscriptionStatus: 'active',
};

function fakeStream(textChunks: string[], usage = {
  input_tokens: 100,
  output_tokens: 30,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
}) {
  // The service consumes the stream as an async iterable of RawMessageStreamEvent
  // objects + reads `.finalMessage()` at the end.
  async function* iterate() {
    for (const t of textChunks) {
      yield {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: t },
      };
    }
  }
  return {
    [Symbol.asyncIterator]: () => iterate(),
    finalMessage: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: textChunks.join('') }],
      usage,
      model: 'claude-sonnet-4-6',
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';

  // Sensible defaults
  mockPantryFindMany.mockResolvedValue([]);
  mockLeftoverFindMany.mockResolvedValue([]);
  mockSlotAffinityFindMany.mockResolvedValue([]);
  mockPairAffinityFindMany.mockResolvedValue([]);
  mockMacroGoalsFindUnique.mockResolvedValue(null);
  mockMealHistoryFindMany.mockResolvedValue([]);
  mockMealFindMany.mockResolvedValue([]);
  mockUserPreferencesFindUnique.mockResolvedValue(null);
  mockUserPhysicalProfileFindUnique.mockResolvedValue(null);
  mockMealPlanFindFirst.mockResolvedValue(null);
  mockCookingLogFindMany.mockResolvedValue([]);
  mockMessageCount.mockResolvedValue(0);
  mockConversationFindMany.mockResolvedValue([]);
  mockConversationFindFirst.mockResolvedValue(null);
});

describe('POST /api/coach/conversations', () => {
  it('creates a conversation with auto-generated title that injects user signals', async () => {
    mockUserFindUnique.mockResolvedValue(FREE_USER);
    mockConversationCreate.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: 'conv-1', createdAt: new Date(), lastMessageAt: new Date() }),
    );

    const res = await request(makeApp())
      .post('/api/coach/conversations')
      .set('x-user-id', 'user-free')
      .send({ firstMessage: 'Chicken thighs and broccoli — ideas?' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('conv-1');
    expect(res.body.title.length).toBeGreaterThan(0);
    expect(res.body.tier).toBe('free');
  });
});

describe('GET /api/coach/conversations', () => {
  it('returns only the requesting user threads', async () => {
    mockUserFindUnique.mockResolvedValue(FREE_USER);
    mockConversationFindMany.mockResolvedValue([
      { id: 'c1', userId: 'user-free', title: 't1', tier: 'free', createdAt: new Date(), lastMessageAt: new Date() },
    ]);

    const res = await request(makeApp())
      .get('/api/coach/conversations')
      .set('x-user-id', 'user-free');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockConversationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-free' }),
      }),
    );
  });
});

describe('GET /api/coach/conversations/:id', () => {
  it('returns conversation + messages when it belongs to the user', async () => {
    mockUserFindUnique.mockResolvedValue(FREE_USER);
    mockConversationFindFirst.mockResolvedValue({
      id: 'c1',
      userId: 'user-free',
      title: 't1',
      tier: 'free',
      createdAt: new Date(),
      lastMessageAt: new Date(),
    });
    mockMessageFindMany.mockResolvedValue([
      { id: 'm1', conversationId: 'c1', role: 'user', content: 'hi', createdAt: new Date() },
    ]);

    const res = await request(makeApp())
      .get('/api/coach/conversations/c1')
      .set('x-user-id', 'user-free');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('c1');
    expect(res.body.messages).toHaveLength(1);
  });

  it('returns 404 when the conversation belongs to another user', async () => {
    mockUserFindUnique.mockResolvedValue(FREE_USER);
    mockConversationFindFirst.mockResolvedValue(null);

    const res = await request(makeApp())
      .get('/api/coach/conversations/other')
      .set('x-user-id', 'user-free');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/coach/message — streaming', () => {
  it('streams SSE chunks and persists the assistant reply', async () => {
    mockUserFindUnique.mockResolvedValue(FREE_USER);
    mockConversationFindFirst.mockResolvedValue({
      id: 'c1',
      userId: 'user-free',
      title: 't1',
      tier: 'free',
    });
    mockMessageCreate.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: 'm-new' }),
    );
    mockStream.mockReturnValue(
      fakeStream(['Hi ', 'there', '!']),
    );

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'c1', message: 'Hello' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('Hi ');
    expect(res.text).toContain('there');
    expect(res.text).toContain('event: done');
    // user message + assistant message persisted
    expect(mockMessageCreate).toHaveBeenCalledTimes(2);
  });

  it('returns 402 with paywall payload at the 11th free-tier message of the day', async () => {
    mockUserFindUnique.mockResolvedValue(FREE_USER);
    mockConversationFindFirst.mockResolvedValue({
      id: 'c1',
      userId: 'user-free',
      title: 't1',
      tier: 'free',
    });
    mockMessageCount.mockResolvedValue(50); // S17c — free daily cap bumped from 10 → 50

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'c1', message: 'one more' });

    expect(res.status).toBe(402);
    expect(res.body.error).toBe('COACH_DAILY_CAP');
    expect(res.body.paywall).toBeDefined();
    expect(mockStream).not.toHaveBeenCalled();
  });

  it('does not cap premium users at 50 messages', async () => {
    mockUserFindUnique.mockResolvedValue(PREMIUM_USER);
    mockConversationFindFirst.mockResolvedValue({
      id: 'c1',
      userId: 'user-pro',
      title: 't1',
      tier: 'premium',
    });
    mockMessageCount.mockResolvedValue(50);
    mockMessageCreate.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: 'm-new' }),
    );
    mockStream.mockReturnValue(fakeStream(['ok']));

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-pro')
      .send({ conversationId: 'c1', message: 'hi' });

    expect(res.status).toBe(200);
    expect(mockStream).toHaveBeenCalled();
  });

  it('returns 404 when the conversation does not belong to the user', async () => {
    mockUserFindUnique.mockResolvedValue(FREE_USER);
    mockConversationFindFirst.mockResolvedValue(null);

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'other', message: 'hi' });

    expect(res.status).toBe(404);
  });
});
