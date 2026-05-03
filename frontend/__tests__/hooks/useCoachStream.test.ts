// frontend/__tests__/hooks/useCoachStream.test.ts
// 10Y-B: streaming hook — accumulates chunks, toggles isStreaming, surfaces paywall on 402.

import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('../../lib/api', () => ({
  coachApi: {
    createConversation: jest.fn(),
    streamMessage: jest.fn(),
  },
}));

import { useCoachStream } from '../../hooks/useCoachStream';
import { coachApi } from '../../lib/api';

const mockedCoachApi = coachApi as jest.Mocked<typeof coachApi>;

async function* mkStream(chunks: string[]): AsyncIterableIterator<any> {
  for (const c of chunks) {
    yield { type: 'text', text: c };
  }
}

async function* mkRichStream(events: any[]): AsyncIterableIterator<any> {
  for (const e of events) {
    yield e;
  }
}

describe('useCoachStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a conversation when none exists, then streams chunks into messages', async () => {
    mockedCoachApi.createConversation.mockResolvedValue({
      id: 'c1',
      title: 'Hi',
      tier: 'free',
      createdAt: 'now',
      lastMessageAt: 'now',
    });
    mockedCoachApi.streamMessage.mockReturnValue(
      mkStream(['Hello', ' there', '!'])
    );

    const { result } = renderHook(() => useCoachStream());

    await act(async () => {
      await result.current.sendMessage('Hi coach');
    });

    expect(mockedCoachApi.createConversation).toHaveBeenCalledWith('Hi coach');
    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    const messages = result.current.messages;
    // user message + assistant message
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Hi coach');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toBe('Hello there!');
  });

  it('toggles isStreaming during stream', async () => {
    mockedCoachApi.createConversation.mockResolvedValue({
      id: 'c1',
      title: 'Hi',
      tier: 'free',
      createdAt: 'now',
      lastMessageAt: 'now',
    });

    let resolveStreamComplete: () => void = () => {};
    const streamComplete = new Promise<void>(r => { resolveStreamComplete = r; });

    async function* slowStream() {
      yield { type: 'text', text: 'first ' };
      await streamComplete;
      yield { type: 'text', text: 'last' };
    }

    mockedCoachApi.streamMessage.mockReturnValue(slowStream() as any);

    const { result } = renderHook(() => useCoachStream());

    let sendPromise!: Promise<void>;
    await act(async () => {
      sendPromise = result.current.sendMessage('Hi');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    resolveStreamComplete();
    await act(async () => {
      await sendPromise;
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it('accumulates tool_use + tool_result events into the assistant message toolUses', async () => {
    mockedCoachApi.createConversation.mockResolvedValue({
      id: 'c1',
      title: 'Hi',
      tier: 'free',
      createdAt: 'now',
      lastMessageAt: 'now',
    });

    const recipeResult = { recipes: [{ id: 'r1', title: 'A' }] };
    const events = [
      { type: 'tool_use', name: 'find_recipes', toolUseId: 'tu_1', input: { cuisines: ['Italian'] } },
      { type: 'tool_result', toolUseId: 'tu_1', result: recipeResult },
      { type: 'text', text: 'Here is a pick' },
      { type: 'done' },
    ];
    mockedCoachApi.streamMessage.mockReturnValue(mkRichStream(events));

    const { result } = renderHook(() => useCoachStream());

    await act(async () => {
      await result.current.sendMessage('find me dinner');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    const assistant = result.current.messages.find(m => m.role === 'assistant');
    expect(assistant?.content).toBe('Here is a pick');
    expect(assistant?.toolUses).toHaveLength(1);
    expect(assistant?.toolUses?.[0].name).toBe('find_recipes');
    expect(assistant?.toolUses?.[0].toolUseId).toBe('tu_1');
    expect(assistant?.toolUses?.[0].result).toEqual(recipeResult);
  });

  it('surfaces paywall info with reason="photos" when streamMessage throws PRO_FEATURE attachments', async () => {
    mockedCoachApi.createConversation.mockResolvedValue({
      id: 'c1',
      title: 'Hi',
      tier: 'free',
      createdAt: 'now',
      lastMessageAt: 'now',
    });

    const proFeatureError: any = new Error('PRO_FEATURE');
    proFeatureError.code = 'PRO_FEATURE';
    proFeatureError.feature = 'attachments';
    proFeatureError.paywall = { headline: 'Snap your fridge', cta: 'Upgrade' };

    mockedCoachApi.streamMessage.mockImplementation((() => {
      async function* errStream() {
        throw proFeatureError;
        // eslint-disable-next-line no-unreachable
        yield { type: 'text', text: '' };
      }
      return errStream();
    }) as any);

    const { result } = renderHook(() => useCoachStream());

    await act(async () => {
      await result.current.sendMessage('photo me');
    });

    await waitFor(() => {
      expect(result.current.paywall).not.toBeNull();
    });
    expect(result.current.paywallReason).toBe('photos');
  });

  it('Phase 7: tool_result with PRO_FEATURE sets paywallReason="generic" exactly once', async () => {
    mockedCoachApi.createConversation.mockResolvedValue({
      id: 'c1',
      title: 'Hi',
      tier: 'free',
      createdAt: 'now',
      lastMessageAt: 'now',
    });

    // First send: 2 PRO_FEATURE tool_results in sequence — only the first
    // should flip the paywall reason.
    const events1 = [
      { type: 'tool_use', name: 'log_meal', toolUseId: 'tu_1', input: {} },
      {
        type: 'tool_result',
        toolUseId: 'tu_1',
        result: { error: 'PRO_FEATURE', feature: 'write_tools' },
      },
      { type: 'tool_use', name: 'compose_plate', toolUseId: 'tu_2', input: {} },
      {
        type: 'tool_result',
        toolUseId: 'tu_2',
        result: { error: 'PRO_FEATURE', feature: 'write_tools' },
      },
      { type: 'text', text: 'That is a Pro feature' },
      { type: 'done' },
    ];
    mockedCoachApi.streamMessage.mockReturnValueOnce(mkRichStream(events1));

    const { result } = renderHook(() => useCoachStream());

    await act(async () => {
      await result.current.sendMessage('log my meal');
    });

    await waitFor(() => {
      expect(result.current.paywallReason).toBe('generic');
    });
    expect(result.current.paywall).not.toBeNull();

    // Dismiss the paywall — second occurrence in the same conversation MUST
    // NOT re-open it (the ref guards against re-prompting).
    act(() => {
      result.current.dismissPaywall();
    });
    expect(result.current.paywallReason).toBeNull();

    const events2 = [
      { type: 'tool_use', name: 'log_meal', toolUseId: 'tu_3', input: {} },
      {
        type: 'tool_result',
        toolUseId: 'tu_3',
        result: { error: 'PRO_FEATURE', feature: 'write_tools' },
      },
      { type: 'text', text: 'Still Pro only' },
      { type: 'done' },
    ];
    mockedCoachApi.streamMessage.mockReturnValueOnce(mkRichStream(events2));

    await act(async () => {
      await result.current.sendMessage('try again');
    });
    expect(result.current.paywallReason).toBeNull();
  });

  it('surfaces paywall info when streamMessage throws COACH_DAILY_CAP', async () => {
    mockedCoachApi.createConversation.mockResolvedValue({
      id: 'c1',
      title: 'Hi',
      tier: 'free',
      createdAt: 'now',
      lastMessageAt: 'now',
    });

    const paywallError: any = new Error('COACH_DAILY_CAP');
    paywallError.code = 'COACH_DAILY_CAP';
    paywallError.paywall = { headline: 'Daily limit', cta: 'Upgrade' };

    mockedCoachApi.streamMessage.mockImplementation((() => {
      async function* errStream() {
        throw paywallError;
        // eslint-disable-next-line no-unreachable
        yield { type: 'text', text: '' };
      }
      return errStream();
    }) as any);

    const { result } = renderHook(() => useCoachStream());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    await waitFor(() => {
      expect(result.current.paywall).not.toBeNull();
    });
    expect(result.current.paywall?.headline).toBe('Daily limit');
    expect(result.current.paywall?.cta).toBe('Upgrade');
    expect(result.current.isStreaming).toBe(false);
  });
});
