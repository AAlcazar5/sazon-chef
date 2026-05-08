// Phase 8 (10Y-E): conversation export route — Pro-only Markdown.

const mockUserFindUnique = jest.fn();
const mockConversationFindFirst = jest.fn();
const mockMessageFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    coachConversation: {
      findFirst: (...a: unknown[]) => mockConversationFindFirst(...a),
    },
    coachMessage: {
      findMany: (...a: unknown[]) => mockMessageFindMany(...a),
    },
  },
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { stream: jest.fn() },
  })),
}));

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { coachRoutes } from '../../src/modules/coach/coachRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const uid = (req.headers['x-user-id'] as string | undefined) ?? 'user-1';
    (req as Request & { user: { id: string; email: string } }).user = {
      id: uid,
      email: `${uid}@test.com`,
    };
    next();
  });
  app.use('/api/coach', coachRoutes);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/coach/conversations/:id/export', () => {
  it('Pro user gets 200 with text/markdown content-type and well-formed body', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-pro',
      subscriptionTier: 'premium',
      subscriptionStatus: 'active',
    });
    mockConversationFindFirst.mockResolvedValue({
      id: 'conv-1',
      userId: 'user-pro',
      title: 'Pesto night chat',
    });
    mockMessageFindMany.mockResolvedValue([
      {
        role: 'user',
        content: 'What should I cook?',
        createdAt: new Date('2026-05-01T12:00:00Z'),
      },
      {
        role: 'assistant',
        content: 'Try pesto pasta.',
        createdAt: new Date('2026-05-01T12:00:01Z'),
      },
    ]);

    const res = await request(makeApp())
      .get('/api/coach/conversations/conv-1/export')
      .set('x-user-id', 'user-pro');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/markdown/);
    expect(res.text).toContain('# Pesto night chat');
    expect(res.text).toContain('## You');
    expect(res.text).toContain('## Sazon');
    expect(res.text).toContain('Try pesto pasta.');
    expect(res.text).toContain('2026-05-01T12:00:00.000Z');
  });

  it('Free user gets 403 PRO_FEATURE', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-free',
      subscriptionTier: 'free',
      subscriptionStatus: 'free',
    });

    const res = await request(makeApp())
      .get('/api/coach/conversations/conv-1/export')
      .set('x-user-id', 'user-free');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PRO_FEATURE');
    expect(res.body.feature).toBe('export');
  });

  it('Cross-user 404', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-pro',
      subscriptionTier: 'premium',
      subscriptionStatus: 'active',
    });
    mockConversationFindFirst.mockResolvedValue(null);

    const res = await request(makeApp())
      .get('/api/coach/conversations/other-conv/export')
      .set('x-user-id', 'user-pro');

    expect(res.status).toBe(404);
  });
});
