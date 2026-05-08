// Tier $$ — $$2.3 — End-to-end integration test for the Gemini route path.
//
// Exercises POST /api/coach/message with COACH_FREE_PROVIDER=gemini-direct +
// GEMINI_API_KEY set. Mocks `fetch` (which the geminiAdapter uses) to return
// streamed Gemini SSE chunks. Asserts:
//   - the route routes to gemini-direct (not Anthropic)
//   - the SSE response carries the streamed text deltas back to the client
//   - the assistant message persists with the resolved Gemini model id
//   - tool_use_start events flow through when the model emits a functionCall
//
// Differs from the unit test in coachTools/openRouter/gemini adapters: this
// proves the WHOLE pipe (route → adapter → translation → SSE → DB write)
// works end-to-end on the Gemini path. Anthropic path is already covered
// by the existing coach.test.ts / coach.tier.test.ts suite.

const mockUserFindUnique = jest.fn();
const mockConversationFindFirst = jest.fn();
const mockConversationUpdate = jest.fn();
const mockMessageCreate = jest.fn();
const mockMessageFindMany = jest.fn();
const mockMessageCount = jest.fn();
const mockMacroGoalsFindUnique = jest.fn();
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
      findMany: (...a: unknown[]) => mockMessageFindMany(...a),
      aggregate: jest.fn().mockResolvedValue({
        _sum: { promptTokens: 0, cacheReadTokens: 0, completionTokens: 0 },
      }),
    },
    macroGoals: {
      findUnique: (...a: unknown[]) => mockMacroGoalsFindUnique(...a),
    },
    userPhysicalProfile: {
      findUnique: (...a: unknown[]) => mockUserPhysicalProfileFindUnique(...a),
    },
  },
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

const mockEmit = jest.fn();
jest.mock('@/services/coachAnalytics', () => ({
  emit: (...a: unknown[]) => mockEmit(...a),
}));

// Anthropic SDK shouldn't be invoked on the Gemini path — but jest still
// needs a stub for it so the import doesn't throw at module-load time.
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { stream: jest.fn() },
  })),
}));

import express from 'express';
import request from 'supertest';
import { coachRoutes } from '../../src/modules/coach/coachRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/coach', coachRoutes);
  return app;
}

/**
 * Build a fake Response object whose `body.getReader()` yields the given
 * SSE lines as Uint8Array chunks. Matches the contract geminiAdapter expects.
 */
function fakeGeminiSSEStream(lines: string[]): Response {
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        let i = 0;
        return {
          read: async () => {
            if (i >= lines.length) return { done: true, value: undefined };
            const enc = new TextEncoder().encode(lines[i]);
            i += 1;
            return { done: false, value: enc };
          },
        };
      },
    },
  } as unknown as Response;
}

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_ENV: Record<string, string | undefined> = {};

beforeAll(() => {
  ORIGINAL_ENV.COACH_FREE_PROVIDER = process.env.COACH_FREE_PROVIDER;
  ORIGINAL_ENV.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  ORIGINAL_ENV.COACH_LLM_PROVIDER = process.env.COACH_LLM_PROVIDER;
});

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
  for (const k of Object.keys(ORIGINAL_ENV)) {
    if (ORIGINAL_ENV[k] === undefined) delete process.env[k];
    else process.env[k] = ORIGINAL_ENV[k];
  }
});

const FREE_USER = {
  id: 'user-free',
  subscriptionTier: 'free',
  subscriptionStatus: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.COACH_FREE_PROVIDER = 'gemini-direct';
  process.env.GEMINI_API_KEY = 'g-test-key';
  delete process.env.COACH_LLM_PROVIDER;
  mockMacroGoalsFindUnique.mockResolvedValue(null);
  mockUserPhysicalProfileFindUnique.mockResolvedValue(null);
  mockMessageCount.mockResolvedValue(0);
  mockMessageFindMany.mockResolvedValue([]); // no prior history
  mockMessageCreate.mockImplementation(({ data }) =>
    Promise.resolve({ ...data, id: 'm-new' }),
  );
  mockConversationUpdate.mockResolvedValue({});
  mockUserFindUnique.mockResolvedValue(FREE_USER);
  mockConversationFindFirst.mockResolvedValue({
    id: 'c1',
    userId: 'user-free',
    title: 't1',
    tier: 'free',
  });
});

describe('POST /api/coach/message → Gemini-direct path', () => {
  it('routes a free-tier turn through Gemini and streams text back to the client', async () => {
    const fetchMock = jest.fn(async () =>
      fakeGeminiSSEStream([
        'data: {"candidates":[{"content":{"parts":[{"text":"Hey "}],"role":"model"}}],"modelVersion":"gemini-3-flash-preview"}\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"there!"}]}}]}\n',
        'data: {"usageMetadata":{"promptTokenCount":42,"candidatesTokenCount":3}}\n',
      ]),
    ) as jest.Mock;
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'c1', message: 'hi' });

    expect(res.status).toBe(200);
    // SSE stream must include the text we mocked.
    expect(res.text).toContain('Hey ');
    expect(res.text).toContain('there!');

    // The fetch should have been a Gemini API call — never Anthropic.
    expect(fetchMock).toHaveBeenCalled();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toMatch(/generativelanguage\.googleapis\.com/);
    expect(url).toMatch(/streamGenerateContent/);
  });

  it('persists the assistant message with the Gemini model id and the streamed token usage', async () => {
    const fetchMock = jest.fn(async () =>
      fakeGeminiSSEStream([
        'data: {"candidates":[{"content":{"parts":[{"text":"persian fesenjan"}]}}],"modelVersion":"gemini-3-flash-preview"}\n',
        'data: {"usageMetadata":{"promptTokenCount":120,"candidatesTokenCount":18}}\n',
      ]),
    ) as jest.Mock;
    global.fetch = fetchMock as unknown as typeof fetch;

    await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'c1', message: 'persian recs?' });

    // Two messages persist per turn: user (line ~414 of coachRoutes) +
    // assistant (final). Find the assistant write.
    const assistantWrite = mockMessageCreate.mock.calls.find(
      (c) => c[0].data.role === 'assistant',
    );
    expect(assistantWrite).toBeDefined();
    const data = assistantWrite![0].data;
    expect(data.modelUsed).toBe('gemini-3-flash-preview');
    expect(data.promptTokens).toBe(120);
    expect(data.completionTokens).toBe(18);
    // Gemini doesn't support Anthropic-style cache; both fields are 0.
    expect(data.cacheReadTokens).toBe(0);
    expect(data.cacheWriteTokens).toBe(0);
  });

  it('emits SSE tool_use event when Gemini returns a functionCall', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      // First iteration → functionCall. Second iteration after our fake tool
      // result → final text answer.
      const callIdx = (fetchMock as jest.Mock).mock.calls.length - 1;
      if (callIdx === 0) {
        return fakeGeminiSSEStream([
          'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"get_pantry","args":{}}}]}}]}\n',
        ]);
      }
      return fakeGeminiSSEStream([
        'data: {"candidates":[{"content":{"parts":[{"text":"Got cilantro and lime."}]}}]}\n',
        'data: {"usageMetadata":{"promptTokenCount":300,"candidatesTokenCount":7}}\n',
      ]);
    }) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'c1', message: "what's in my pantry?" });

    expect(res.status).toBe(200);
    // tool_use SSE event for get_pantry must be in the response.
    expect(res.text).toContain('event: tool_use');
    expect(res.text).toContain('get_pantry');
    // Tool result event also makes it through.
    expect(res.text).toContain('event: tool_result');
    // Final text from the second iteration is streamed.
    expect(res.text).toContain('Got cilantro and lime.');
    // Two Gemini calls (initial + post-tool-result re-call).
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // NOTE: factory-level fallback routing (missing GEMINI_API_KEY → Anthropic;
  // premium tier → Anthropic regardless of env flag) is already covered by
  // the factory unit tests in __tests__/services/llm/factory.test.ts. The
  // happy paths above prove the FULL pipe wires up. Re-asserting fallback at
  // the route layer would require resetting the module-level cached
  // Anthropic SDK client between tests — out of scope for this integration.
});
