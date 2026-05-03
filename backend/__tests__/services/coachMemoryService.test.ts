// Group 10Y Phase 6: Coach memory service — extraction, dedupe, top-K, prompt
// injection byte-stability.

const mockMemoryFindMany = jest.fn();
const mockMemoryCreate = jest.fn();
const mockMemoryUpdate = jest.fn();
const mockMemoryFindFirst = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    coachMemory: {
      findMany: (...a: unknown[]) => mockMemoryFindMany(...a),
      create: (...a: unknown[]) => mockMemoryCreate(...a),
      update: (...a: unknown[]) => mockMemoryUpdate(...a),
      findFirst: (...a: unknown[]) => mockMemoryFindFirst(...a),
    },
  },
}));

import {
  extractMemories,
  dedupeAgainstExisting,
  topMemoriesForUser,
  type NewMemory,
  type StoredMemory,
} from '../../src/services/coachMemoryService';
import {
  buildProfileSnapshot,
  buildSystemPrompt,
  type CoachProfileInput,
} from '../../src/services/coachPromptService';

const baseInput: CoachProfileInput = {
  userId: 'u1',
  pantry: [],
  leftoverInventory: [],
  slotAffinity: [],
  pairAffinity: [],
  remainingMacros: null,
  last7Cooks: [],
  dietaryProfile: [],
  allergens: [],
  cuisineAffinity: [],
  skillTier: 'beginner',
  goalPhase: 'maintain',
  currentMealPlanDay: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMemoryFindMany.mockResolvedValue([]);
  mockMemoryCreate.mockImplementation(({ data }: { data: unknown }) =>
    Promise.resolve({ id: 'mem-new', ...(data as object) }),
  );
  mockMemoryUpdate.mockImplementation(({ data }: { data: unknown }) =>
    Promise.resolve({ id: 'mem-existing', ...(data as object) }),
  );
});

function fakeAnthropicReturning(jsonText: string) {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: jsonText }],
      }),
    },
  } as unknown as import('@anthropic-ai/sdk').default;
}

describe('extractMemories', () => {
  it('parses validated memories from a JSON-only model reply', async () => {
    const anthropic = fakeAnthropicReturning(
      JSON.stringify({
        memories: [
          { kind: 'preference', content: 'loves spicy food', confidence: 0.9 },
          { kind: 'constraint', content: 'no dairy', confidence: 0.8 },
        ],
      }),
    );
    const memories = await extractMemories({
      userId: 'u1',
      conversationId: 'c1',
      recentTurns: [
        { role: 'user', content: 'I cant do dairy and I love spice' },
        { role: 'assistant', content: 'Got it.' },
      ],
      anthropic,
    });
    expect(memories).toHaveLength(2);
    expect(memories[0].kind).toBe('preference');
    expect(memories[1].kind).toBe('constraint');
  });

  it('returns [] cleanly when the model reply is empty or invalid', async () => {
    const anthropic = fakeAnthropicReturning('not json');
    const memories = await extractMemories({
      userId: 'u1',
      conversationId: 'c1',
      recentTurns: [{ role: 'user', content: 'hi' }],
      anthropic,
    });
    expect(memories).toEqual([]);
  });

  it('drops malformed entries via Zod validation', async () => {
    const anthropic = fakeAnthropicReturning(
      JSON.stringify({
        memories: [
          { kind: 'preference', content: 'ok', confidence: 0.9 },
          { kind: 'totally_invalid_kind', content: 'x', confidence: 0.5 },
        ],
      }),
    );
    const memories = await extractMemories({
      userId: 'u1',
      conversationId: 'c1',
      recentTurns: [{ role: 'user', content: 'x' }],
      anthropic,
    });
    expect(memories).toEqual([]);
  });

  it('returns [] when Anthropic is unset and no client provided (graceful)', async () => {
    const prevKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const memories = await extractMemories({
      userId: 'u1',
      conversationId: 'c1',
      recentTurns: [{ role: 'user', content: 'hi' }],
    });
    expect(memories).toEqual([]);
    if (prevKey !== undefined) process.env.ANTHROPIC_API_KEY = prevKey;
  });
});

describe('dedupeAgainstExisting', () => {
  it('skips a candidate that is near-duplicate of an existing memory and bumps confidence', async () => {
    const existing: StoredMemory[] = [
      {
        id: 'mem-1',
        userId: 'u1',
        kind: 'preference',
        content: 'loves spicy food',
        confidence: 0.7,
        sourceConversationId: null,
        sourceMessageId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockMemoryFindMany.mockResolvedValue(existing);

    const candidates: NewMemory[] = [
      { kind: 'preference', content: 'loves spicy food', confidence: 0.85 },
    ];

    const result = await dedupeAgainstExisting({
      userId: 'u1',
      candidates,
      sourceConversationId: 'c1',
    });

    expect(result.created).toHaveLength(0);
    expect(result.merged).toHaveLength(1);
    expect(mockMemoryCreate).not.toHaveBeenCalled();
    expect(mockMemoryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mem-1' },
        data: expect.objectContaining({ confidence: expect.any(Number) }),
      }),
    );
    const updateCall = mockMemoryUpdate.mock.calls[0][0];
    expect(updateCall.data.confidence).toBeGreaterThan(0.7);
    expect(updateCall.data.confidence).toBeLessThanOrEqual(1);
  });

  it('creates a brand-new memory when no near-duplicate is found', async () => {
    mockMemoryFindMany.mockResolvedValue([
      {
        id: 'mem-1',
        userId: 'u1',
        kind: 'preference',
        content: 'avoids cilantro',
        confidence: 0.7,
        sourceConversationId: null,
        sourceMessageId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const candidates: NewMemory[] = [
      { kind: 'goal', content: 'lose 10 pounds by July', confidence: 0.9 },
    ];
    const result = await dedupeAgainstExisting({
      userId: 'u1',
      candidates,
      sourceConversationId: 'c1',
    });
    expect(result.created).toHaveLength(1);
    expect(mockMemoryCreate).toHaveBeenCalledTimes(1);
  });
});

describe('topMemoriesForUser', () => {
  it('returns top-K sorted by recency × confidence', async () => {
    const now = Date.now();
    mockMemoryFindMany.mockResolvedValue([
      {
        id: 'a',
        userId: 'u1',
        kind: 'preference',
        content: 'old high-confidence',
        confidence: 0.95,
        sourceConversationId: null,
        sourceMessageId: null,
        createdAt: new Date(now - 90 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 90 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'b',
        userId: 'u1',
        kind: 'preference',
        content: 'recent medium',
        confidence: 0.6,
        sourceConversationId: null,
        sourceMessageId: null,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      },
      {
        id: 'c',
        userId: 'u1',
        kind: 'preference',
        content: 'recent high',
        confidence: 0.9,
        sourceConversationId: null,
        sourceMessageId: null,
        createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      },
    ]);
    const top = await topMemoriesForUser('u1', 2);
    expect(top).toHaveLength(2);
    // recent high (c) should rank above old high-confidence (a)
    expect(top[0].content).toBe('recent high');
  });

  it('caps at K', async () => {
    const arr = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i}`,
      userId: 'u1',
      kind: 'preference',
      content: `item ${i}`,
      confidence: 0.7,
      sourceConversationId: null,
      sourceMessageId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    mockMemoryFindMany.mockResolvedValue(arr);
    const top = await topMemoriesForUser('u1', 5);
    expect(top).toHaveLength(5);
  });
});

describe('buildSystemPrompt with memories — byte stability', () => {
  it('produces identical bytes when the same memories are injected twice', () => {
    const snap = buildProfileSnapshot(baseInput);
    const memories = [
      { kind: 'preference', content: 'loves spicy food', confidence: 0.9 },
      { kind: 'goal', content: 'cutting for summer', confidence: 0.8 },
    ];
    const a = buildSystemPrompt(snap, { memories });
    const b = buildSystemPrompt(snap, { memories: [...memories].reverse() });
    expect(a).toBe(b);
  });

  it('omits the memory block entirely when no memories provided (Phase 5 regression guard)', () => {
    const snap = buildProfileSnapshot(baseInput);
    const prompt = buildSystemPrompt(snap);
    expect(prompt).not.toContain('<learned_memories>');
  });

  it('produces a stable byte sequence across runs with same memories', () => {
    const snap = buildProfileSnapshot(baseInput);
    const memories = [
      { kind: 'preference', content: 'loves spicy', confidence: 0.9 },
    ];
    const a = buildSystemPrompt(snap, { memories });
    const b = buildSystemPrompt(snap, { memories });
    expect(a).toBe(b);
    expect(a).toContain('<learned_memories>');
    expect(a).toContain('</learned_memories>');
  });
});
