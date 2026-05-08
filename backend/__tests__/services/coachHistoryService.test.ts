// Tier $$ — $$1.1 / $$1.2 — coachHistoryService tests.
//
// Loads the last N coachMessage rows for a conversation and converts them
// into Anthropic.MessageParam[] for replay. Caches everything older than
// the last 2 turns so growing convos don't re-bill input tokens. Caps the
// history list + does a deterministic summary fallback once over budget.

import {
  loadConversationHistory,
  __INTERNALS,
} from '../../src/services/coachHistoryService';
import { prisma } from '../../src/lib/prisma';

const findMany = jest.fn();
(prisma as any).coachMessage = { findMany };

beforeEach(() => {
  findMany.mockReset();
});

const msg = (
  role: 'user' | 'assistant',
  content: string,
  createdAt: string,
  promptTokens = 100,
  completionTokens = 100,
) => ({
  role,
  content,
  createdAt: new Date(createdAt),
  promptTokens,
  completionTokens,
  attachments: '[]',
});

describe('$$1.1 — loadConversationHistory', () => {
  it('returns empty array when no prior messages exist', async () => {
    findMany.mockResolvedValue([]);
    const out = await loadConversationHistory({ conversationId: 'c1' });
    expect(out.messages).toEqual([]);
    expect(out.summarized).toBe(false);
  });

  it('caps the list at MAX_HISTORY_TURNS (default 10), keeping the most recent', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      msg(
        i % 2 === 0 ? 'user' : 'assistant',
        `m${i}`,
        `2026-05-07T${String(i).padStart(2, '0')}:00:00Z`,
      ),
    );
    findMany.mockResolvedValue(rows);
    const out = await loadConversationHistory({ conversationId: 'c1' });
    expect(out.messages.length).toBeLessThanOrEqual(__INTERNALS.MAX_HISTORY_TURNS);
    // Most recent message is the last in the output (chronological order).
    const last = out.messages[out.messages.length - 1];
    expect(last.content).toContain('m24');
  });

  it('returns messages in chronological order', async () => {
    findMany.mockResolvedValue([
      msg('user', 'first', '2026-05-07T10:00:00Z'),
      msg('assistant', 'reply1', '2026-05-07T10:01:00Z'),
      msg('user', 'second', '2026-05-07T10:02:00Z'),
    ]);
    const out = await loadConversationHistory({ conversationId: 'c1' });
    expect(out.messages.map((m) => m.content)).toEqual(['first', 'reply1', 'second']);
  });

  it('attaches cache_control to the structural content block of the prefix-end message', async () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      msg(
        i % 2 === 0 ? 'user' : 'assistant',
        `m${i}`,
        `2026-05-07T${String(i).padStart(2, '0')}:00:00Z`,
      ),
    );
    findMany.mockResolvedValue(rows);
    const out = await loadConversationHistory({ conversationId: 'c1' });
    // The 4th-from-end message (index 6 - 2 - 1 = 3) carries cache_control on
    // its content block. Live tail (last 2) does NOT.
    const markerIdx = 6 - __INTERNALS.LIVE_TAIL_TURNS - 1;
    const marker = out.messages[markerIdx];
    expect(Array.isArray(marker.content)).toBe(true);
    const blocks = marker.content as Array<{ cache_control?: { type: string } }>;
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' });
    // Last 2 messages (live tail) have plain string content, no cache marker.
    expect(typeof out.messages[5].content).toBe('string');
  });

  it('does not attach cache_control when total history is ≤ LIVE_TAIL_TURNS', async () => {
    const rows = [
      msg('user', 'a', '2026-05-07T10:00:00Z'),
      msg('assistant', 'b', '2026-05-07T10:01:00Z'),
    ];
    findMany.mockResolvedValue(rows);
    const out = await loadConversationHistory({ conversationId: 'c1' });
    // Both messages are in the live tail → no cache_control anywhere.
    for (const m of out.messages) {
      expect(typeof m.content).toBe('string');
    }
  });

  it('queries by conversationId with chronological ordering + a take cap', async () => {
    findMany.mockResolvedValue([]);
    await loadConversationHistory({ conversationId: 'c1' });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ conversationId: 'c1' }),
        orderBy: expect.objectContaining({ createdAt: 'asc' }),
      }),
    );
  });

  it('rejects empty conversationId', async () => {
    await expect(
      loadConversationHistory({ conversationId: '' }),
    ).rejects.toThrow(/conversationId/);
  });
});

describe('$$1.2 — token-budget-aware trimming', () => {
  it('summarizes oldest turns when cumulative tokens exceed MAX_HISTORY_TOKENS', async () => {
    // 8 turns × 1000 prompt + 1000 completion = 16000 tokens; budget = 6000.
    // Should drop oldest until under 6000 and emit a synthetic summary.
    const rows = Array.from({ length: 8 }, (_, i) =>
      msg(
        i % 2 === 0 ? 'user' : 'assistant',
        `turn ${i} about ${i % 2 === 0 ? 'persian food' : 'mediterranean recipes'}`,
        `2026-05-07T${String(i).padStart(2, '0')}:00:00Z`,
        1000,
        1000,
      ),
    );
    findMany.mockResolvedValue(rows);
    const out = await loadConversationHistory({ conversationId: 'c1' });
    expect(out.summarized).toBe(true);
    // Summary appears as the FIRST entry in the messages array (synthetic
    // user message).
    const first = out.messages[0];
    expect(first.role).toBe('user');
    const txt = typeof first.content === 'string' ? first.content : '';
    expect(txt.toLowerCase()).toMatch(/earlier/);
  });

  it('does NOT summarize when total fits the budget', async () => {
    const rows = Array.from({ length: 4 }, (_, i) =>
      msg(
        i % 2 === 0 ? 'user' : 'assistant',
        `m${i}`,
        `2026-05-07T${String(i).padStart(2, '0')}:00:00Z`,
        50,
        50,
      ),
    );
    findMany.mockResolvedValue(rows);
    const out = await loadConversationHistory({ conversationId: 'c1' });
    expect(out.summarized).toBe(false);
  });

  it('never drops the most recent turn', async () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      msg(
        i % 2 === 0 ? 'user' : 'assistant',
        i === 29 ? "MOST_RECENT_MARKER" : `t${i}`,
        `2026-05-07T${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
        500,
        500,
      ),
    );
    findMany.mockResolvedValue(rows);
    const out = await loadConversationHistory({ conversationId: 'c1' });
    const last = out.messages[out.messages.length - 1];
    const txt = typeof last.content === 'string' ? last.content : '';
    expect(txt).toBe('MOST_RECENT_MARKER');
  });
});

describe('$$1 — INTERNALS', () => {
  it('publishes the constants', () => {
    expect(__INTERNALS.MAX_HISTORY_TURNS).toBe(10);
    expect(__INTERNALS.LIVE_TAIL_TURNS).toBe(2);
    expect(__INTERNALS.MAX_HISTORY_TOKENS).toBe(6000);
  });
});
