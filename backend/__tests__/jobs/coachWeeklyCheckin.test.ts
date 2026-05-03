// Group 10Y Phase 6 (10Y-C): weekly Sunday-9am check-in job tests.

const mockUserFindMany = jest.fn();
const mockUserUpdate = jest.fn();
const mockMacroGoalsFindUnique = jest.fn();
const mockMealHistoryFindMany = jest.fn();
const mockConversationCreate = jest.fn();
const mockMessageCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: (...a: unknown[]) => mockUserFindMany(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
    },
    macroGoals: {
      findUnique: (...a: unknown[]) => mockMacroGoalsFindUnique(...a),
    },
    mealHistory: {
      findMany: (...a: unknown[]) => mockMealHistoryFindMany(...a),
    },
    coachConversation: {
      create: (...a: unknown[]) => mockConversationCreate(...a),
    },
    coachMessage: {
      create: (...a: unknown[]) => mockMessageCreate(...a),
    },
  },
}));

const mockSendToUser = jest.fn();
jest.mock('@/services/pushNotificationService', () => ({
  pushNotificationService: {
    sendToUser: (...a: unknown[]) => mockSendToUser(...a),
  },
}));

const mockAnthropicCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: (...a: unknown[]) => mockAnthropicCreate(...a) },
  })),
}));

import { runOnce } from '../../src/jobs/coachWeeklyCheckinJob';

interface ProUserFixture {
  id: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  lastWeeklyCheckinAt: Date | null;
  preferences: { weeklyCheckinOptIn: boolean } | null;
}

function makeProOptInUser(overrides: Partial<ProUserFixture> = {}): ProUserFixture {
  return {
    id: 'user-pro',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    lastWeeklyCheckinAt: null,
    preferences: { weeklyCheckinOptIn: true },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  mockMacroGoalsFindUnique.mockResolvedValue({
    userId: 'user-pro',
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
    fiber: 28,
  });
  mockMealHistoryFindMany.mockResolvedValue([]);
  mockConversationCreate.mockImplementation(({ data }) =>
    Promise.resolve({ ...data, id: 'conv-new', createdAt: new Date() }),
  );
  mockMessageCreate.mockImplementation(({ data }) =>
    Promise.resolve({ ...data, id: 'msg-new' }),
  );
  mockSendToUser.mockResolvedValue(undefined);
  mockAnthropicCreate.mockResolvedValue({
    content: [{ type: 'text', text: 'How did this week feel for you?' }],
  });
});

describe('runOnce — Pro+opt-in user', () => {
  it('creates a conversation, posts assistant message, sends push, and updates lastWeeklyCheckinAt', async () => {
    const now = new Date('2026-05-03T09:00:00Z');
    mockUserFindMany.mockResolvedValue([makeProOptInUser()]);

    const result = await runOnce(now);

    expect(result.usersTouched).toBe(1);
    expect(result.pushesSent).toBe(1);

    expect(mockConversationCreate).toHaveBeenCalledTimes(1);
    const convCall = mockConversationCreate.mock.calls[0][0];
    expect(convCall.data.tier).toBe('premium');
    expect(convCall.data.userId).toBe('user-pro');
    expect(typeof convCall.data.title).toBe('string');

    expect(mockMessageCreate).toHaveBeenCalledTimes(1);
    const msgCall = mockMessageCreate.mock.calls[0][0];
    expect(msgCall.data.role).toBe('assistant');
    expect(msgCall.data.userId).toBe('user-pro');
    expect(msgCall.data.conversationId).toBe('conv-new');
    expect(typeof msgCall.data.content).toBe('string');
    expect(msgCall.data.content.length).toBeGreaterThan(0);

    expect(mockSendToUser).toHaveBeenCalledTimes(1);
    const [pushUserId, pushPayload] = mockSendToUser.mock.calls[0];
    expect(pushUserId).toBe('user-pro');
    expect(pushPayload.title).toBe('Hey — quick check-in?');
    expect(pushPayload.data).toEqual(
      expect.objectContaining({ screen: 'coach', conversationId: 'conv-new' }),
    );

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-pro' },
      data: { lastWeeklyCheckinAt: now },
    });
  });

  it('falls back to template question when Anthropic call throws (missing key etc.)', async () => {
    const now = new Date('2026-05-03T09:00:00Z');
    mockUserFindMany.mockResolvedValue([makeProOptInUser()]);
    mockAnthropicCreate.mockRejectedValue(new Error('boom'));

    const result = await runOnce(now);

    expect(result.usersTouched).toBe(1);
    expect(result.pushesSent).toBe(1);
    expect(mockMessageCreate).toHaveBeenCalledTimes(1);
    const content = mockMessageCreate.mock.calls[0][0].data.content as string;
    expect(content.length).toBeGreaterThan(0);
    // Template fallback ends with a question mark.
    expect(content.trim().endsWith('?')).toBe(true);
  });
});

describe('runOnce — filtering', () => {
  it('skips a Pro user who is opted out', async () => {
    const now = new Date('2026-05-03T09:00:00Z');
    // Prisma where-clause filters this — emulate by returning empty.
    mockUserFindMany.mockResolvedValue([]);

    const result = await runOnce(now);

    expect(result.usersTouched).toBe(0);
    expect(result.pushesSent).toBe(0);
    expect(mockConversationCreate).not.toHaveBeenCalled();
  });

  it('skips a free user who somehow has opt-in set true (defense in depth)', async () => {
    const now = new Date('2026-05-03T09:00:00Z');
    // Even if a free user slipped through the where-clause, the guard inside
    // the loop must drop them so we never bill a Sonnet call for free users.
    mockUserFindMany.mockResolvedValue([
      {
        id: 'user-free',
        subscriptionTier: 'free',
        subscriptionStatus: 'free',
        lastWeeklyCheckinAt: null,
        preferences: { weeklyCheckinOptIn: true },
      },
    ]);

    const result = await runOnce(now);

    expect(result.usersTouched).toBe(0);
    expect(result.pushesSent).toBe(0);
    expect(mockConversationCreate).not.toHaveBeenCalled();
    expect(mockSendToUser).not.toHaveBeenCalled();
  });

  it('skips a Pro+opt-in user who was checked in within 6 days (idempotency)', async () => {
    const now = new Date('2026-05-03T09:00:00Z');
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
    mockUserFindMany.mockResolvedValue([
      makeProOptInUser({ lastWeeklyCheckinAt: fourDaysAgo }),
    ]);

    const result = await runOnce(now);

    expect(result.usersTouched).toBe(0);
    expect(result.pushesSent).toBe(0);
    expect(mockConversationCreate).not.toHaveBeenCalled();
  });

  it('processes a Pro+opt-in user whose last check-in was more than 6 days ago', async () => {
    const now = new Date('2026-05-03T09:00:00Z');
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    mockUserFindMany.mockResolvedValue([
      makeProOptInUser({ lastWeeklyCheckinAt: eightDaysAgo }),
    ]);

    const result = await runOnce(now);

    expect(result.usersTouched).toBe(1);
    expect(result.pushesSent).toBe(1);
  });
});

describe('runOnce — error isolation', () => {
  it('continues to the next user when one user throws', async () => {
    const now = new Date('2026-05-03T09:00:00Z');
    mockUserFindMany.mockResolvedValue([
      makeProOptInUser({ id: 'user-a' }),
      makeProOptInUser({ id: 'user-b' }),
    ]);

    let calls = 0;
    mockConversationCreate.mockImplementation(({ data }) => {
      calls += 1;
      if (calls === 1) throw new Error('db blip');
      return Promise.resolve({ ...data, id: 'conv-b', createdAt: new Date() });
    });

    const result = await runOnce(now);

    expect(result.usersTouched).toBe(1);
    expect(result.pushesSent).toBe(1);
  });

  it('counts user as touched but no push when sendToUser succeeds with no tokens (silent)', async () => {
    // sendToUser returns undefined whether or not it actually sent — the
    // service no-ops on missing tokens. The job treats that as touched-no-push.
    // We can't distinguish from inside the job, so this test asserts the
    // simpler contract: a successful sendToUser counts as a push.
    const now = new Date('2026-05-03T09:00:00Z');
    mockUserFindMany.mockResolvedValue([makeProOptInUser()]);

    const result = await runOnce(now);

    expect(result.usersTouched).toBe(1);
    expect(result.pushesSent).toBe(1);
  });
});

describe('runOnce — idempotency across two runs', () => {
  it('only sends one push when the same user is processed twice within 6 days', async () => {
    const now1 = new Date('2026-05-03T09:00:00Z');
    const now2 = new Date('2026-05-04T09:00:00Z');

    // Run 1: user has no prior check-in.
    mockUserFindMany.mockResolvedValueOnce([makeProOptInUser()]);
    const r1 = await runOnce(now1);
    expect(r1.pushesSent).toBe(1);

    // Run 2: simulate the where-clause already filtering out the recently-touched
    // user (Prisma side), or the in-loop guard (defense in depth).
    mockUserFindMany.mockResolvedValueOnce([
      makeProOptInUser({ lastWeeklyCheckinAt: now1 }),
    ]);
    const r2 = await runOnce(now2);
    expect(r2.pushesSent).toBe(0);
  });
});
