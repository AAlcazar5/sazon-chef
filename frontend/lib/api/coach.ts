// P9 — extracted from lib/api.ts (coach types + coachApi)
import { apiClient, api, getAuthToken, getBaseURL } from './core';

// ─── Sazon (Group 10Y) ───────────────────────────────────────────────────────

export type CoachTier = 'free' | 'premium';
export type CoachMessageRole = 'user' | 'assistant';

export interface CoachConversation {
  id: string;
  title: string;
  tier: CoachTier;
  createdAt: string;
  lastMessageAt: string;
}

export interface CoachMessage {
  id: string;
  role: CoachMessageRole;
  content: string;
  createdAt: string;
  attachments?: string;
}

export interface CoachToolUseEvent {
  type: 'tool_use';
  name: string;
  toolUseId: string;
  input: unknown;
}

export interface CoachToolResultEvent {
  type: 'tool_result';
  toolUseId: string;
  result: unknown;
}

export interface CoachTextEvent {
  type: 'text';
  text: string;
}

export interface CoachDoneEvent {
  type: 'done';
}

export interface CoachCostNoticeEvent {
  type: 'cost_notice';
  message: string;
}

export interface CoachMedicalDeflectionEvent {
  type: 'medical_deflection';
  reason: string;
}

export type CoachStreamEvent =
  | CoachTextEvent
  | CoachToolUseEvent
  | CoachToolResultEvent
  | CoachCostNoticeEvent
  | CoachMedicalDeflectionEvent
  | CoachDoneEvent;

export type CoachAttachmentMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp';

export interface CoachAttachment {
  type: 'image_base64';
  mediaType: CoachAttachmentMediaType;
  data: string;
}

export interface CoachIdentifiedIngredient {
  name: string;
  confidence: number;
}

export interface CoachExtractPantryResponse {
  ingredients: CoachIdentifiedIngredient[];
}

export interface CoachConversationDetail extends CoachConversation {
  messages: CoachMessage[];
}

export interface CoachPaywallInfo {
  headline: string;
  cta: string;
}

export class CoachStreamError extends Error {
  code: string;
  paywall?: CoachPaywallInfo;
  feature?: string;
  status?: number;
  constructor(
    message: string,
    code: string,
    options?: { paywall?: CoachPaywallInfo; status?: number; feature?: string },
  ) {
    super(message);
    this.name = 'CoachStreamError';
    this.code = code;
    this.paywall = options?.paywall;
    this.status = options?.status;
    this.feature = options?.feature;
  }
}

interface CoachStreamRawError {
  error?: string;
  feature?: string;
  paywall?: CoachPaywallInfo;
}

// SSE stream → async iterator of typed events. Uses `expo/fetch` (not RN's
// built-in `fetch`) because RN's fetch returns `response.body = null`,
// which prevents reading streamed SSE chunks. `expo/fetch` exposes a real
// ReadableStream on iOS + Android. Throws CoachStreamError on 4xx / network
// failure.
//
// We intentionally only import `expo/fetch` lazily inside the function so
// jest unit tests (which mock `lib/api`) don't have to mock the import.
async function* streamCoachMessage(params: {
  conversationId: string;
  message: string;
  signal?: AbortSignal;
  attachments?: CoachAttachment[];
}): AsyncIterableIterator<CoachStreamEvent> {
  const url = `${getBaseURL()}/coach/message`;
  const token = getAuthToken();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { fetch: streamingFetch } = require('expo/fetch') as typeof import('expo/fetch');
  const response = await streamingFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      conversationId: params.conversationId,
      message: params.message,
      ...(params.attachments && params.attachments.length > 0
        ? { attachments: params.attachments }
        : {}),
    }),
    // expo/fetch supports AbortSignal via the same options shape.
    ...(params.signal ? { signal: params.signal } : {}),
  });

  if (response.status === 400) {
    let parsed: CoachStreamRawError = {};
    try {
      parsed = (await response.json()) as CoachStreamRawError;
    } catch {
      // ignore
    }
    throw new CoachStreamError(
      parsed.error ?? 'INVALID_ATTACHMENTS',
      parsed.error ?? 'INVALID_ATTACHMENTS',
      { status: 400 },
    );
  }

  if (response.status === 402) {
    let parsed: CoachStreamRawError = {};
    try {
      parsed = (await response.json()) as CoachStreamRawError;
    } catch {
      // ignore — keep empty parsed object
    }
    throw new CoachStreamError(
      parsed.error ?? 'COACH_DAILY_CAP',
      'COACH_DAILY_CAP',
      { paywall: parsed.paywall, status: 402 },
    );
  }

  if (response.status === 403) {
    let parsed: CoachStreamRawError = {};
    try {
      parsed = (await response.json()) as CoachStreamRawError;
    } catch {
      // ignore — keep empty parsed object
    }
    throw new CoachStreamError(
      parsed.error ?? 'PRO_FEATURE',
      'PRO_FEATURE',
      { paywall: parsed.paywall, status: 403, feature: parsed.feature },
    );
  }

  if (!response.ok || !response.body) {
    throw new CoachStreamError(
      `Coach stream failed: ${response.status}`,
      'COACH_STREAM_ERROR',
      { status: response.status },
    );
  }

  const reader = (response.body as unknown as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines.
      let sepIdx = buffer.indexOf('\n\n');
      while (sepIdx !== -1) {
        const rawEvent = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        const parsed = parseSseEvent(rawEvent);
        if (parsed.event === 'done') {
          yield { type: 'done' };
          return;
        }
        if (parsed.data === undefined) {
          sepIdx = buffer.indexOf('\n\n');
          continue;
        }
        if (parsed.event === 'tool_use') {
          try {
            const payload = JSON.parse(parsed.data) as { name: string; toolUseId: string; input: unknown };
            yield { type: 'tool_use', name: payload.name, toolUseId: payload.toolUseId, input: payload.input };
          } catch {
            // ignore malformed event
          }
        } else if (parsed.event === 'cost_notice') {
          try {
            const payload = JSON.parse(parsed.data) as { message: string };
            yield { type: 'cost_notice', message: payload.message };
          } catch {
            // ignore malformed event
          }
        } else if (parsed.event === 'tool_result') {
          try {
            const payload = JSON.parse(parsed.data) as { toolUseId: string; result: unknown };
            yield { type: 'tool_result', toolUseId: payload.toolUseId, result: payload.result };
          } catch {
            // ignore malformed event
          }
        } else if (parsed.event === 'medical_deflection') {
          try {
            const payload = JSON.parse(parsed.data) as { reason?: string };
            yield { type: 'medical_deflection', reason: payload.reason ?? 'medical_claim' };
          } catch {
            // ignore malformed event
          }
        } else {
          yield { type: 'text', text: parsed.data };
        }
        sepIdx = buffer.indexOf('\n\n');
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
}

function parseSseEvent(raw: string): { event?: string; data?: string } {
  const lines = raw.split('\n');
  let event: string | undefined;
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }
  return { event, data: dataLines.length ? dataLines.join('\n') : undefined };
}

export type CoachMemoryKind =
  | 'preference'
  | 'goal'
  | 'constraint'
  | 'milestone';

export interface CoachMemory {
  id: string;
  userId: string;
  kind: CoachMemoryKind;
  content: string;
  confidence: number;
  sourceConversationId: string | null;
  sourceMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CoachApi {
  listConversations: () => Promise<CoachConversation[]>;
  getConversation: (id: string) => Promise<CoachConversationDetail>;
  createConversation: (firstMessage: string) => Promise<CoachConversation>;
  streamMessage: (params: {
    conversationId: string;
    message: string;
    signal?: AbortSignal;
    attachments?: CoachAttachment[];
  }) => AsyncIterableIterator<CoachStreamEvent>;
  getCoachContext: () => Promise<CoachContextResponse>;
  extractPantryFromImage: (params: {
    imageBase64: string;
    mediaType: CoachAttachmentMediaType;
  }) => Promise<CoachExtractPantryResponse>;
  listMemories: () => Promise<CoachMemory[]>;
  updateMemory: (
    id: string,
    patch: { content?: string; confidence?: number },
  ) => Promise<CoachMemory>;
  deleteMemory: (id: string) => Promise<void>;
  exportConversation: (id: string) => Promise<string>;
}

export interface CoachContextResponse {
  // Tier S S5: ingredient names (resolved server-side from componentId), used
  // for chip copy like "I have leftover spinach — bridge it forward".
  pantryExpiringSoon: string[];
  leftoverInventory: Array<{
    id: string;
    componentId: string;
    slot: string;
    portionsRemaining: number;
    expiresAt: string;
    name?: string | null;
  }>;
  remainingMacros: { calories: number; protein: number; carbs: number; fat: number } | null;
  topAdjacentCuisine: string | null;
}

export const coachApi: CoachApi = {
  listConversations: async () => {
    const res = await api.get<CoachConversation[]>('/coach/conversations');
    return res.data;
  },
  getConversation: async (id: string) => {
    const res = await api.get<CoachConversationDetail>(
      `/coach/conversations/${encodeURIComponent(id)}`,
    );
    return res.data;
  },
  createConversation: async (firstMessage: string) => {
    const res = await api.post<CoachConversation>('/coach/conversations', { firstMessage });
    return res.data;
  },
  streamMessage: streamCoachMessage,
  getCoachContext: async () => {
    const res = await api.get<CoachContextResponse>('/coach/context');
    return res.data;
  },
  extractPantryFromImage: async ({ imageBase64, mediaType }) => {
    const res = await api.post<CoachExtractPantryResponse>(
      '/coach/extract-pantry-from-image',
      { imageBase64, mediaType },
    );
    return res.data;
  },
  listMemories: async () => {
    const res = await api.get<CoachMemory[]>('/coach/memories');
    return res.data;
  },
  updateMemory: async (id, patch) => {
    const res = await api.patch<CoachMemory>(
      `/coach/memories/${encodeURIComponent(id)}`,
      patch,
    );
    return res.data;
  },
  deleteMemory: async (id) => {
    await api.delete(`/coach/memories/${encodeURIComponent(id)}`);
  },
  exportConversation: async (id: string) => {
    const res = await api.get<string>(
      `/coach/conversations/${encodeURIComponent(id)}/export`,
      { responseType: 'text', transformResponse: [(d) => d as string] },
    );
    return res.data;
  },
};

export type { ApiResponse, ApiError } from './core';
