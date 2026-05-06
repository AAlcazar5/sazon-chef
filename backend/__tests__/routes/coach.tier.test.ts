// Phase 4 (10Y-D): tier-enforcement integration tests for /api/coach/message.
// Verifies attachments paywall (403 PRO_FEATURE), mid-conversation downgrade,
// and analytics emission for cap + paywall events.

const mockUserFindUnique = jest.fn();
const mockConversationFindFirst = jest.fn();
const mockConversationUpdate = jest.fn();
const mockMessageCreate = jest.fn();
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

const mockStream = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { stream: (...a: unknown[]) => mockStream(...a) },
  })),
}));

const mockEmit = jest.fn();
jest.mock('@/services/coachAnalytics', () => ({
  emit: (...a: unknown[]) => mockEmit(...a),
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

function fakeStream(textChunks: string[], model = 'claude-sonnet-4-6') {
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
      usage: {
        input_tokens: 50,
        output_tokens: 20,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
      model,
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  mockMacroGoalsFindUnique.mockResolvedValue(null);
  mockUserPhysicalProfileFindUnique.mockResolvedValue(null);
  mockMessageCount.mockResolvedValue(0);
  mockMessageCreate.mockImplementation(({ data }) =>
    Promise.resolve({ ...data, id: 'm-new' }),
  );
});

describe('POST /api/coach/message — attachments paywall (Phase 4)', () => {
  it('rejects free-tier attachment requests with 403 PRO_FEATURE before invoking the stream', async () => {
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

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({
        conversationId: 'c1',
        message: 'whats in this fridge?',
        attachments: [{ type: 'image_url', url: 'https://example.com/a.jpg' }],
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PRO_FEATURE');
    expect(res.body.feature).toBe('attachments');
    expect(res.body.paywall).toBeDefined();
    expect(res.body.paywall.headline).toBeTruthy();
    expect(res.body.paywall.cta).toBeTruthy();
    expect(mockStream).not.toHaveBeenCalled();
  });

  it('emits coach_paywall_view analytics on 403 PRO_FEATURE', async () => {
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

    await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({
        conversationId: 'c1',
        message: 'photo',
        attachments: [{ type: 'image_url', url: 'x' }],
      });

    const events = mockEmit.mock.calls.map(c => c[0]);
    expect(events).toContain('coach_paywall_view');
  });

  it('allows premium-tier attachment requests through to the stream', async () => {
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
    mockStream.mockReturnValue(fakeStream(['ok'], 'claude-opus-4-7'));

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-pro')
      .send({
        conversationId: 'c1',
        message: 'check this out',
        // Phase 5: image_base64 is the canonical attachment shape.
        attachments: [
          {
            type: 'image_base64',
            mediaType: 'image/jpeg',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(mockStream).toHaveBeenCalled();
  });
});

describe('POST /api/coach/message — mid-conversation tier downgrade', () => {
  it('uses the free-tier model (Haiku) for the next message when a previously-premium conversation has past_due status', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-was-pro',
      subscriptionTier: 'premium',
      subscriptionStatus: 'past_due',
    });
    mockConversationFindFirst.mockResolvedValue({
      id: 'c1',
      userId: 'user-was-pro',
      title: 't1',
      tier: 'premium',
    });
    mockStream.mockReturnValue(fakeStream(['hi']));

    await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-was-pro')
      .send({ conversationId: 'c1', message: 'still there?' });

    expect(mockStream).toHaveBeenCalled();
    const params = mockStream.mock.calls[0][0];
    expect(String(params.model)).toMatch(/haiku/);
  });
});

describe('POST /api/coach/message — analytics emission', () => {
  it('emits coach_cap_hit when the daily free cap is hit', async () => {
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
    mockMessageCount.mockResolvedValue(10);

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'c1', message: 'one more' });

    expect(res.status).toBe(402);
    const events = mockEmit.mock.calls.map(c => c[0]);
    expect(events).toContain('coach_cap_hit');
    expect(events).toContain('coach_paywall_view');
  });

  it('emits coach_message_sent on a successful free-tier reply', async () => {
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
    mockStream.mockReturnValue(fakeStream(['hi']));

    await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-free')
      .send({ conversationId: 'c1', message: 'hi' });

    const events = mockEmit.mock.calls.map(c => c[0]);
    expect(events).toContain('coach_message_sent');
  });

  it('emits coach_pro_message_sent on a premium-tier reply', async () => {
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
    mockStream.mockReturnValue(fakeStream(['hi'], 'claude-opus-4-7'));

    await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-pro')
      .send({ conversationId: 'c1', message: 'hi' });

    const events = mockEmit.mock.calls.map(c => c[0]);
    expect(events).toContain('coach_pro_message_sent');
  });
});
