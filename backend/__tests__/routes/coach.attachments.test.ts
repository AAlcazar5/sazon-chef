// Phase 5 (10Y-E): Coach photo-attachment integration tests.
// Verifies Pro-only image flow on POST /api/coach/message + the new
// POST /api/coach/extract-pantry-from-image endpoint.

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
const mockMessagesCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      stream: (...a: unknown[]) => mockStream(...a),
      create: (...a: unknown[]) => mockMessagesCreate(...a),
    },
  })),
}));

import express from 'express';
import request from 'supertest';
import { coachRoutes } from '../../src/modules/coach/coachRoutes';

function makeApp() {
  const app = express();
  // Allow large payloads since attachments include base64 image data.
  app.use(express.json({ limit: '12mb' }));
  // Phase 4 middleware (requireCoachPro) reads req.user.id; mirror what auth
  // middleware would set in production.
  app.use((req, _res, next) => {
    const userId = (req.headers['x-user-id'] as string | undefined) ?? 'user-1';
    (req as unknown as { user: { id: string } }).user = { id: userId };
    next();
  });
  app.use('/api/coach', coachRoutes);
  return app;
}

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const PRO_USER = {
  id: 'user-pro',
  subscriptionTier: 'premium',
  subscriptionStatus: 'active',
};

const FREE_USER = {
  id: 'user-free',
  subscriptionTier: 'free',
  subscriptionStatus: 'free',
};

function fakeStream(text: string) {
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
        input_tokens: 100,
        output_tokens: 30,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
      model: 'claude-opus-4-7',
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

describe('POST /api/coach/message — Pro photo attachments', () => {
  it('accepts a single image_base64 attachment and persists sanitized record (no base64)', async () => {
    mockUserFindUnique.mockResolvedValue(PRO_USER);
    mockConversationFindFirst.mockResolvedValue({
      id: 'c1',
      userId: 'user-pro',
      title: 't1',
      tier: 'premium',
    });
    mockStream.mockReturnValue(fakeStream("Looks like chicken and lime."));

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-pro')
      .send({
        conversationId: 'c1',
        message: "what's in my fridge?",
        attachments: [
          { type: 'image_base64', mediaType: 'image/jpeg', data: TINY_PNG_BASE64 },
        ],
      });

    expect(res.status).toBe(200);
    expect(mockStream).toHaveBeenCalledTimes(1);

    // First call to messageCreate is the user message — should carry sanitized
    // attachments (no raw base64).
    const userCreateCall = mockMessageCreate.mock.calls[0][0];
    expect(userCreateCall.data.role).toBe('user');
    const persisted = JSON.parse(userCreateCall.data.attachments) as {
      attachments: Array<{ type: string; mediaType: string; sizeBytes: number }>;
    };
    expect(persisted.attachments).toHaveLength(1);
    expect(persisted.attachments[0].type).toBe('image_base64');
    expect(persisted.attachments[0].mediaType).toBe('image/jpeg');
    expect(persisted.attachments[0].sizeBytes).toBeGreaterThan(0);
    // The serialized record must NOT include the raw base64 payload.
    expect(JSON.stringify(persisted)).not.toContain(TINY_PNG_BASE64.slice(0, 40));

    // The Anthropic stream call must have included an image content block.
    const streamParams = mockStream.mock.calls[0][0];
    const firstUserMsg = streamParams.messages[0];
    expect(Array.isArray(firstUserMsg.content)).toBe(true);
    const imageBlock = (firstUserMsg.content as Array<{ type: string }>).find(
      (b) => b.type === 'image',
    );
    expect(imageBlock).toBeDefined();
  });

  it('rejects more than 4 attachments with 400 INVALID_ATTACHMENTS before the stream', async () => {
    mockUserFindUnique.mockResolvedValue(PRO_USER);
    mockConversationFindFirst.mockResolvedValue({
      id: 'c1',
      userId: 'user-pro',
      title: 't1',
      tier: 'premium',
    });

    const five = Array.from({ length: 5 }, () => ({
      type: 'image_base64',
      mediaType: 'image/jpeg',
      data: TINY_PNG_BASE64,
    }));

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-pro')
      .send({ conversationId: 'c1', message: 'too many', attachments: five });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ATTACHMENTS');
    expect(res.body.maxCount).toBe(4);
    expect(mockStream).not.toHaveBeenCalled();
  });

  it('rejects unsupported media types with 400 INVALID_ATTACHMENTS', async () => {
    mockUserFindUnique.mockResolvedValue(PRO_USER);
    mockConversationFindFirst.mockResolvedValue({
      id: 'c1',
      userId: 'user-pro',
      title: 't1',
      tier: 'premium',
    });

    const res = await request(makeApp())
      .post('/api/coach/message')
      .set('x-user-id', 'user-pro')
      .send({
        conversationId: 'c1',
        message: 'bad media',
        attachments: [
          { type: 'image_base64', mediaType: 'application/pdf', data: 'abc' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ATTACHMENTS');
    expect(mockStream).not.toHaveBeenCalled();
  });
});

describe('POST /api/coach/extract-pantry-from-image', () => {
  it('returns 200 with parsed ingredients for a Pro user (happy path)', async () => {
    mockUserFindUnique.mockResolvedValue(PRO_USER);
    mockMessagesCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ingredients: [
              { name: 'chicken thigh', confidence: 0.9 },
              { name: 'broccoli', confidence: 0.8 },
            ],
          }),
        },
      ],
      role: 'assistant',
      id: 'msg',
      model: 'claude-opus-4-7',
      stop_reason: 'end_turn',
      type: 'message',
      usage: { input_tokens: 0, output_tokens: 0 },
    });

    const res = await request(makeApp())
      .post('/api/coach/extract-pantry-from-image')
      .set('x-user-id', 'user-pro')
      .send({ imageBase64: TINY_PNG_BASE64, mediaType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.ingredients).toHaveLength(2);
    expect(res.body.ingredients[0].name).toBe('chicken thigh');
  });

  it('returns 403 PRO_FEATURE for a free user', async () => {
    mockUserFindUnique.mockResolvedValue(FREE_USER);

    const res = await request(makeApp())
      .post('/api/coach/extract-pantry-from-image')
      .set('x-user-id', 'user-free')
      .send({ imageBase64: TINY_PNG_BASE64, mediaType: 'image/jpeg' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PRO_FEATURE');
    expect(res.body.feature).toBe('attachments');
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it('returns 400 INVALID_MEDIA_TYPE on unsupported mediaType', async () => {
    mockUserFindUnique.mockResolvedValue(PRO_USER);
    const res = await request(makeApp())
      .post('/api/coach/extract-pantry-from-image')
      .set('x-user-id', 'user-pro')
      .send({ imageBase64: TINY_PNG_BASE64, mediaType: 'image/tiff' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_MEDIA_TYPE');
  });

  it('returns 422 VISION_FAILED with code=invalid_response when the model returns malformed JSON', async () => {
    mockUserFindUnique.mockResolvedValue(PRO_USER);
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{ broken json' }],
      role: 'assistant',
      id: 'msg',
      model: 'claude-opus-4-7',
      stop_reason: 'end_turn',
      type: 'message',
      usage: { input_tokens: 0, output_tokens: 0 },
    });

    const res = await request(makeApp())
      .post('/api/coach/extract-pantry-from-image')
      .set('x-user-id', 'user-pro')
      .send({ imageBase64: TINY_PNG_BASE64, mediaType: 'image/jpeg' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VISION_FAILED');
    expect(res.body.code).toBe('invalid_response');
  });
});
