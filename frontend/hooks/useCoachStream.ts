// frontend/hooks/useCoachStream.ts
// 10Y-B: encapsulates Coach send + SSE streaming. Owns the message list, the
// streaming flag, the surfaced paywall state, and the active conversationId
// (creates a new conversation lazily on first send).

import { useCallback, useRef, useState } from 'react';
import { coachApi, type CoachMessage, type CoachPaywallInfo } from '../lib/api';

interface PaywallErrorShape {
  code?: string;
  paywall?: CoachPaywallInfo;
}

function isPaywallError(err: unknown): err is PaywallErrorShape {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as PaywallErrorShape).code === 'COACH_DAILY_CAP'
  );
}

export interface CoachUiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface UseCoachStreamResult {
  messages: CoachUiMessage[];
  isStreaming: boolean;
  error: string | null;
  paywall: CoachPaywallInfo | null;
  conversationId: string | null;
  sendMessage: (text: string) => Promise<void>;
  setConversationId: (id: string | null) => void;
  setMessages: (messages: CoachUiMessage[]) => void;
  reset: () => void;
}

const makeId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function useCoachStream(initial?: { conversationId?: string; messages?: CoachMessage[] }): UseCoachStreamResult {
  const [messages, setMessages] = useState<CoachUiMessage[]>(
    (initial?.messages ?? []).map(m => ({ id: m.id, role: m.role, content: m.content })),
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<CoachPaywallInfo | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initial?.conversationId ?? null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setIsStreaming(false);
    setError(null);
    setPaywall(null);
    setConversationId(null);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setError(null);
    setPaywall(null);

    const userMsg: CoachUiMessage = { id: makeId(), role: 'user', content: trimmed };
    const assistantId = makeId();
    setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }]);
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
      });

      let acc = '';
      for await (const chunk of stream) {
        acc += chunk;
        // Replace last assistant bubble's content with the running buffer.
        setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, content: acc } : m)));
      }
    } catch (err) {
      if (isPaywallError(err)) {
        setPaywall(err.paywall ?? { headline: 'Daily limit reached', cta: 'Upgrade' });
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Coach stream failed');
      }
      // Drop the empty assistant placeholder if no content arrived.
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
    conversationId,
    sendMessage,
    setConversationId,
    setMessages,
    reset,
  };
}
