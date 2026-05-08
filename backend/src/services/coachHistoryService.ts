// ROADMAP 4.0 Tier $$ — $$1.1 + $$1.2 — multi-turn conversation history.
//
// Loads recent `coachMessage` rows for a conversation and converts them into
// the `Anthropic.MessageParam[]` shape that the streaming API expects.
//
// Cost optimization: marks the END of the cached prefix (everything older
// than the last LIVE_TAIL_TURNS messages) with `cache_control: ephemeral`,
// so re-rendering history on each turn doesn't re-bill input tokens. The
// live tail stays uncached because new messages bust any cache anyway.
//
// Budget guard ($$1.2): if cumulative prompt+completion tokens exceed
// MAX_HISTORY_TOKENS, drop oldest turns and prepend a synthetic
// "Earlier you discussed: X" summary user-message. No LLM call —
// deterministic extraction from message titles.

import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';

const MAX_HISTORY_TURNS = 10;
const LIVE_TAIL_TURNS = 2;
const MAX_HISTORY_TOKENS = 6000;

export interface LoadConversationHistoryInput {
  conversationId: string;
}

export interface LoadConversationHistoryResult {
  messages: Anthropic.MessageParam[];
  summarized: boolean;
}

interface CoachMessageRow {
  role: string;
  content: string;
  createdAt: Date;
  promptTokens: number;
  completionTokens: number;
  attachments: string;
}

/**
 * Load the recent message history for a conversation, formatted for the
 * Anthropic streaming API. Caches all but the live tail.
 */
export async function loadConversationHistory(
  input: LoadConversationHistoryInput,
): Promise<LoadConversationHistoryResult> {
  if (!input.conversationId) {
    throw new Error('loadConversationHistory: conversationId required');
  }

  const rows = (await (prisma as any).coachMessage.findMany({
    where: { conversationId: input.conversationId },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      content: true,
      createdAt: true,
      promptTokens: true,
      completionTokens: true,
      attachments: true,
    },
    take: MAX_HISTORY_TURNS * 4, // load extra so the budget trim has room
  })) as CoachMessageRow[];

  if (rows.length === 0) {
    return { messages: [], summarized: false };
  }

  // $$1.2 — token-budget trim. Walk newest → oldest, accumulating tokens,
  // and stop once we'd exceed MAX_HISTORY_TOKENS. Prepend a deterministic
  // summary if anything was dropped (either by budget OR by turn cap).
  const reversed = [...rows].reverse();
  const budgetKept: CoachMessageRow[] = [];
  let tokens = 0;
  for (const r of reversed) {
    const cost = (r.promptTokens || 0) + (r.completionTokens || 0);
    if (tokens + cost > MAX_HISTORY_TOKENS && budgetKept.length > 0) break;
    budgetKept.push(r);
    tokens += cost;
  }
  budgetKept.reverse();

  // First-pass trim: hard turn cap with no summary reservation.
  const provisional = budgetKept.slice(-MAX_HISTORY_TURNS);
  const willSummarize = provisional.length < rows.length;
  // Reserve a slot for the summary so the FINAL array (summary + trimmed)
  // stays ≤ MAX_HISTORY_TURNS.
  const turnCap = willSummarize ? MAX_HISTORY_TURNS - 1 : MAX_HISTORY_TURNS;
  let trimmed = budgetKept.slice(-turnCap);
  const droppedRows = rows.length - trimmed.length;
  const summarized = droppedRows > 0;

  // Convert rows to Anthropic.MessageParam[]. Keep `content` as a plain string
  // unless we need to attach `cache_control` (which requires the array form).
  const messages: Anthropic.MessageParam[] = trimmed.map((r) => ({
    role: roleToParam(r.role),
    content: r.content,
  }));

  // $$1.1 — cache marker on the LAST message of the cached prefix. Anthropic
  // caches everything BEFORE (and including) the marker. The live tail
  // (last LIVE_TAIL_TURNS messages) stays uncached. Require a meaningful
  // prefix (at least 2 messages older than the tail) before bothering.
  if (messages.length > LIVE_TAIL_TURNS + 1) {
    const markerIdx = messages.length - LIVE_TAIL_TURNS - 1;
    const target = messages[markerIdx];
    const text = typeof target.content === 'string' ? target.content : '';
    messages[markerIdx] = {
      role: target.role,
      content: [
        {
          type: 'text',
          text,
          cache_control: { type: 'ephemeral' },
        },
      ],
    };
  }

  if (summarized) {
    const dropped = rows.slice(0, droppedRows);
    const summary = buildDeterministicSummary(dropped);
    messages.unshift({ role: 'user', content: summary });
  }

  return { messages, summarized };
}

function roleToParam(role: string): 'user' | 'assistant' {
  return role === 'assistant' ? 'assistant' : 'user';
}

/**
 * Cheap deterministic recap of dropped turns. Pulls the unique nouns
 * (titles, recipe names, cuisine words) from message content. No LLM call.
 */
function buildDeterministicSummary(dropped: CoachMessageRow[]): string {
  const tokens = new Set<string>();
  for (const r of dropped) {
    const words = r.content
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 4 && !STOPWORDS.has(w));
    for (const w of words) tokens.add(w);
    if (tokens.size > 12) break;
  }
  const list = [...tokens].slice(0, 8).join(', ') || 'previous topics';
  return `Earlier you discussed: ${list}.`;
}

const STOPWORDS = new Set([
  'about',
  'would',
  'could',
  'should',
  'their',
  'these',
  'there',
  'where',
  'which',
  'while',
  'because',
  'really',
  'maybe',
  'going',
  'today',
  'right',
  'thanks',
  'thank',
  'yeah',
  'okay',
  'sounds',
  'perfect',
  'great',
  'awesome',
]);

export const __INTERNALS = {
  MAX_HISTORY_TURNS,
  LIVE_TAIL_TURNS,
  MAX_HISTORY_TOKENS,
} as const;
