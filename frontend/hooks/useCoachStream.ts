// frontend/hooks/useCoachStream.ts
// 10Y-B + Phase 3: Coach send + SSE streaming. Owns the message list, the
// streaming flag, the surfaced paywall state, and the active conversationId.
// Phase 3: also accumulates tool_use + tool_result events into the assistant
// message's toolUses array so cards can render inline.

import { useCallback, useRef, useState } from 'react';
import {
  coachApi,
  type CoachAttachment,
  type CoachMessage,
  type CoachPaywallInfo,
} from '../lib/api';

export type CoachPaywallReason =
  | 'cap'
  | 'photos'
  | 'memory'
  | 'weekly_checkin'
  | 'generic';

interface PaywallErrorShape {
  code?: string;
  feature?: string;
  paywall?: CoachPaywallInfo;
}

function isPaywallError(err: unknown): err is PaywallErrorShape {
  if (typeof err !== 'object' || err === null || !('code' in err)) return false;
  const code = (err as PaywallErrorShape).code;
  return code === 'COACH_DAILY_CAP' || code === 'PRO_FEATURE';
}

function reasonFromError(err: PaywallErrorShape): CoachPaywallReason {
  if (err.code === 'COACH_DAILY_CAP') return 'cap';
  if (err.code === 'PRO_FEATURE') {
    switch (err.feature) {
      case 'attachments':
        return 'photos';
      case 'memory':
        return 'memory';
      case 'weekly_checkin':
        return 'weekly_checkin';
      default:
        return 'generic';
    }
  }
  return 'generic';
}

export interface CoachToolUse {
  name: string;
  toolUseId: string;
  input: unknown;
  result?: unknown;
}

export interface CoachUiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolUses?: CoachToolUse[];
}

export interface UseCoachStreamResult {
  messages: CoachUiMessage[];
  isStreaming: boolean;
  error: string | null;
  paywall: CoachPaywallInfo | null;
  paywallReason: CoachPaywallReason | null;
  conversationId: string | null;
  attachmentError: string | null;
  sendMessage: (text: string, attachments?: CoachAttachment[]) => Promise<void>;
  setConversationId: (id: string | null) => void;
  setMessages: (messages: CoachUiMessage[]) => void;
  reset: () => void;
  dismissPaywall: () => void;
  dismissAttachmentError: () => void;
}

const makeId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function hydrateToolUses(raw: CoachMessage): CoachToolUse[] | undefined {
  if (!raw.attachments) return undefined;
  try {
    const parsed = JSON.parse(raw.attachments) as { toolUses?: CoachToolUse[] };
    return parsed.toolUses;
  } catch {
    return undefined;
  }
}

export function useCoachStream(initial?: { conversationId?: string; messages?: CoachMessage[] }): UseCoachStreamResult {
  const [messages, setMessages] = useState<CoachUiMessage[]>(
    (initial?.messages ?? []).map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolUses: hydrateToolUses(m),
    })),
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<CoachPaywallInfo | null>(null);
  const [paywallReason, setPaywallReason] = useState<CoachPaywallReason | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initial?.conversationId ?? null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setIsStreaming(false);
    setError(null);
    setPaywall(null);
    setPaywallReason(null);
    setAttachmentError(null);
    setConversationId(null);
  }, []);

  const dismissPaywall = useCallback(() => {
    setPaywall(null);
    setPaywallReason(null);
  }, []);

  const dismissAttachmentError = useCallback(() => {
    setAttachmentError(null);
  }, []);

  const sendMessage = useCallback(async (text: string, attachments?: CoachAttachment[]) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setError(null);
    setPaywall(null);
    setPaywallReason(null);
    setAttachmentError(null);

    const userMsg: CoachUiMessage = { id: makeId(), role: 'user', content: trimmed };
    const assistantId = makeId();
    setMessages(prev => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', toolUses: [] },
    ]);
    setIsStreaming(true);

    let convoId = conversationId;
    try {
      if (!convoId) {
        const convo = await coachApi.createConversation(trimmed);
        convoId = convo.id;
        setConversationId(convo.id);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      const stream = coachApi.streamMessage({
        conversationId: convoId,
        message: trimmed,
        signal: controller.signal,
        attachments,
      });

      let acc = '';
      const toolUses: CoachToolUse[] = [];
      for await (const event of stream) {
        if (event.type === 'text') {
          acc += event.text;
          setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, content: acc } : m)));
        } else if (event.type === 'tool_use') {
          toolUses.push({
            name: event.name,
            toolUseId: event.toolUseId,
            input: event.input,
          });
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, toolUses: [...toolUses] } : m,
            ),
          );
        } else if (event.type === 'tool_result') {
          const idx = toolUses.findIndex(t => t.toolUseId === event.toolUseId);
          if (idx >= 0) {
            toolUses[idx] = { ...toolUses[idx], result: event.result };
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, toolUses: [...toolUses] } : m,
              ),
            );
          }
        } else if (event.type === 'done') {
          break;
        }
      }
    } catch (err) {
      if (isPaywallError(err)) {
        setPaywall(err.paywall ?? { headline: 'Daily limit reached', cta: 'Upgrade' });
        setPaywallReason(reasonFromError(err));
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === 'INVALID_ATTACHMENTS'
      ) {
        setAttachmentError(
          "That photo didn't upload — try a smaller one or fewer photos.",
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Coach stream failed');
      }
      setMessages(prev => prev.filter(m => !(m.id === assistantId && m.content === '')));
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  }, [conversationId, isStreaming]);

  return {
    messages,
    isStreaming,
    error,
    paywall,
    paywallReason,
    conversationId,
    attachmentError,
    sendMessage,
    setConversationId,
    setMessages,
    reset,
    dismissPaywall,
    dismissAttachmentError,
  };
}
