// frontend/__tests__/e2e/coach/journey.helpers.ts
// Shared mock factories and setup utilities for all Coach E2E journey tests.
// Every journey is a full render-tree integration test (RTL + jest-expo).
// No Detox / Playwright — the project has neither wired up.

import type { CoachConversation, CoachMemory, CoachMessage } from '../../../lib/api';

// ─── Conversation factories ────────────────────────────────────────────────

export function makeConversation(overrides?: Partial<CoachConversation>): CoachConversation {
  return {
    id: 'conv_1',
    title: 'Test conversation',
    tier: 'free',
    createdAt: '2026-05-03T00:00:00Z',
    lastMessageAt: '2026-05-03T12:00:00Z',
    ...overrides,
  };
}

export function makeMemory(overrides?: Partial<CoachMemory>): CoachMemory {
  return {
    id: 'mem_1',
    kind: 'preference',
    content: 'Prefers spicy food',
    confidence: 0.9,
    updatedAt: '2026-05-03T00:00:00Z',
    ...overrides,
  };
}

export function makeMessage(overrides?: Partial<CoachMessage>): CoachMessage {
  return {
    id: `msg_${Date.now()}`,
    role: 'user',
    content: 'Hello',
    createdAt: '2026-05-03T12:00:00Z',
    ...overrides,
  };
}

// ─── SSE stream generator helpers ──────────────────────────────────────────

export async function* textStream(chunks: string[]): AsyncIterableIterator<any> {
  for (const text of chunks) {
    yield { type: 'text', text };
  }
  yield { type: 'done' };
}

export async function* paywallCapStream(): AsyncIterableIterator<any> {
  const err: any = new Error('COACH_DAILY_CAP');
  err.code = 'COACH_DAILY_CAP';
  err.paywall = { headline: 'Daily limit reached', cta: 'Upgrade to Pro' };
  throw err;
  yield; // make TS happy
}

export async function* proFeaturePhotosStream(): AsyncIterableIterator<any> {
  const err: any = new Error('PRO_FEATURE');
  err.code = 'PRO_FEATURE';
  err.feature = 'attachments';
  err.paywall = { headline: 'Snap your fridge', cta: 'Upgrade' };
  throw err;
  yield;
}

export async function* toolCallStream(recipes: Array<{ id: string; title: string }>): AsyncIterableIterator<any> {
  yield { type: 'tool_use', name: 'find_recipes', toolUseId: 'tu_1', input: { query: 'chicken thighs' } };
  yield { type: 'tool_result', toolUseId: 'tu_1', result: { recipes } };
  yield { type: 'text', text: "Here's what I found for you." };
  yield { type: 'done' };
}

export async function* costNoticeStream(notice: string): AsyncIterableIterator<any> {
  yield { type: 'cost_notice', message: notice };
  yield { type: 'text', text: 'Got it, here is a lighter suggestion.' };
  yield { type: 'done' };
}

// ─── Standard mock setup shared across all journey test files ───────────────

/** Returns the accessor needed to call startCheckout from the module mock. */
export function mockSubscriptionHook(overrides?: {
  isPremium?: boolean;
  tier?: string;
  startCheckout?: jest.Mock;
}) {
  const startCheckout = overrides?.startCheckout ?? jest.fn();
  return {
    startCheckout,
    subscription: {
      tier: overrides?.tier ?? 'free',
      isPremium: overrides?.isPremium ?? false,
    },
  };
}
