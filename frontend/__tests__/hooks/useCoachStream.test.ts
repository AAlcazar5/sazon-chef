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

async function* mkStream(chunks: string[]): AsyncIterableIterator<string> {
  for (const c of chunks) {
    yield c;
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
      yield 'first ';
      await streamComplete;
      yield 'last';
    }

    mockedCoachApi.streamMessage.mockReturnValue(slowStream());

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

    mockedCoachApi.streamMessage.mockImplementation(() => {
      async function* errStream() {
        throw paywallError;
        // eslint-disable-next-line no-unreachable
        yield '';
      }
      return errStream();
    });

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
