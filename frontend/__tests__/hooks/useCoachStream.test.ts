// frontend/__tests__/hooks/useCoachStream.test.ts
// 10Y-B: streaming hook — accumulates chunks, toggles isStreaming, surfaces paywall on 402.

import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('../../lib/api', () => ({
  coachApi: {
    createConversation: jest.fn(),
    streamMessage: jest.fn(),
  },
}));

// detectRecipeAsk gates the wedge; only recipe-ask strings should hit
// findOrGenerateRecipe. The bare-food fallback matches some short non-
// recipe phrases ("photo me", "log my meal", "try again") used by older
// tests — mock the detector to a no-op by default and let recipe-card /
// recipe-error tests opt in explicitly.
jest.mock('../../lib/coach/detectRecipeAsk', () => ({
  detectRecipeAsk: jest.fn(),
}));
jest.mock('../../lib/coach/findOrGenerateRecipe', () => ({
  findOrGenerateRecipe: jest.fn(),
}));

import { useCoachStream } from '../../hooks/useCoachStream';
import { coachApi } from '../../lib/api';
import { detectRecipeAsk } from '../../lib/coach/detectRecipeAsk';
import { findOrGenerateRecipe } from '../../lib/coach/findOrGenerateRecipe';

const mockedDetect = detectRecipeAsk as jest.MockedFunction<typeof detectRecipeAsk>;
const mockedFindOrGenerate = findOrGenerateRecipe as jest.MockedFunction<
  typeof findOrGenerateRecipe
>;

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
    // Default: not a recipe ask → SSE path runs. Recipe-card tests
    // override detectRecipeAsk per case.
    mockedDetect.mockReturnValue(null);
    mockedFindOrGenerate.mockRejectedValue(new Error('default: no wedge'));
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

  it('Phase 8: cost_notice event sets the costNotice flag and clears via dismissCostNotice', async () => {
    mockedCoachApi.createConversation.mockResolvedValue({
      id: 'c1',
      title: 'Hi',
      tier: 'premium',
      createdAt: 'now',
      lastMessageAt: 'now',
    });

    const events = [
      { type: 'cost_notice', message: "I'm taking a quick breath — back at full power tomorrow." },
      { type: 'text', text: 'Got it.' },
      { type: 'done' },
    ];
    mockedCoachApi.streamMessage.mockReturnValue(mkRichStream(events));

    const { result } = renderHook(() => useCoachStream());

    await act(async () => {
      await result.current.sendMessage('hi');
    });

    await waitFor(() => {
      expect(result.current.costNotice).toContain('full power tomorrow');
    });

    act(() => {
      result.current.dismissCostNotice();
    });
    expect(result.current.costNotice).toBeNull();
  });

  it('TS#4: medical_deflection event sets state without contaminating assistant text', async () => {
    mockedCoachApi.createConversation.mockResolvedValue({
      id: 'c1',
      title: 'Hi',
      tier: 'free',
      createdAt: 'now',
      lastMessageAt: 'now',
    });

    // Backend emits: event: medical_deflection → data: <text> → event: done.
    // After SSE parsing the hook receives a typed medical_deflection event
    // followed by a text event with the assistant reply.
    const events = [
      { type: 'medical_deflection', reason: 'medical_claim' },
      { type: 'text', text: 'take a deep breath' },
      { type: 'done' },
    ];
    mockedCoachApi.streamMessage.mockReturnValue(mkRichStream(events));

    const { result } = renderHook(() => useCoachStream());

    await act(async () => {
      await result.current.sendMessage('is creatine bad for my kidneys?');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    expect(result.current.medicalDeflection).toEqual({ reason: 'medical_claim' });
    const assistant = result.current.messages.find(m => m.role === 'assistant');
    expect(assistant?.content).toBe('take a deep breath');
    // No JSON contamination — the deflection data is NOT in the message text.
    expect(assistant?.content).not.toContain('reason');
    expect(assistant?.content).not.toContain('medical_claim');
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

  // Founder report 2026-05-19 (round 2): "Grilled chicken" still produced
  // a chatty LLM paragraph ("How about the Mediterranean Chicken Salad
  // Bowl... which way are you leaning?") when the wedge failed because
  // the previous regression locked the OPPOSITE behavior (SSE fall-
  // through). Founder rule, hard: a matched recipe ask MUST render the
  // card (or a card-shaped retry) — NEVER pivot to LLM SSE which produces
  // permission-asking paragraphs. findOrGenerateRecipe already falls back
  // to a catalog candidate; only when BOTH paths fail do we surface
  // recipe-error here.
  it('wedge failure renders recipe-error card (NEVER falls through to LLM SSE)', async () => {
    mockedDetect.mockReturnValue({ query: 'pizza margarita' });
    mockedFindOrGenerate.mockRejectedValueOnce(new Error('gen failed'));
    mockedCoachApi.createConversation.mockResolvedValue({
      id: 'c1',
      title: 'Hi',
      tier: 'free',
      createdAt: 'now',
      lastMessageAt: 'now',
    });
    // Wire SSE so the test would observe a regression if SSE accidentally
    // ran — assertion below pins streamMessage to NOT have been called.
    mockedCoachApi.streamMessage.mockReturnValue(
      mkStream(['Pizza ', 'Margherita ', 'sounds great.']),
    );

    const { result } = renderHook(() => useCoachStream());

    await act(async () => {
      await result.current.sendMessage('pizza margarita');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    const last = result.current.messages.at(-1);
    expect(last?.role).toBe('assistant');
    expect(last?.kind).toBe('recipe-error');
    expect(last?.query).toBe('pizza margarita');
    expect(last?.content).toBe('');
    expect(mockedFindOrGenerate).toHaveBeenCalledWith('pizza margarita', undefined);
    // Critical: SSE must not be invoked for a recipe ask, even on wedge fail.
    expect(mockedCoachApi.streamMessage).not.toHaveBeenCalled();
    expect(mockedCoachApi.createConversation).not.toHaveBeenCalled();
  });

  // Founder ask 2026-05-19: ambiguous asks like "grilled chicken" land
  // on ONE N=1-picked recipe; the swap chip cycles the visible recipe
  // through `recipePool` in ranker order.
  it('recipe-card success carries pool + index + rationale; swapToNextAlternate cycles', async () => {
    mockedDetect.mockReturnValue({ query: 'grilled chicken' });
    const primary = {
      title: 'Grilled Chicken Italian',
      description: '',
      baseServings: 4,
      ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
      steps: ['Grill.'],
    };
    const alt1 = { ...primary, title: 'Grilled Chicken Japanese' };
    const alt2 = { ...primary, title: 'Grilled Chicken Mexican' };
    mockedFindOrGenerate.mockResolvedValueOnce({
      primary,
      alternates: [alt1, alt2],
      rationale: "Picked because you've got paprika on hand.",
    });

    const { result } = renderHook(() => useCoachStream());

    await act(async () => {
      await result.current.sendMessage('grilled chicken');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    const card = result.current.messages.at(-1);
    expect(card?.kind).toBe('recipe-card');
    expect(card?.recipe?.title).toBe('Grilled Chicken Italian');
    expect(card?.recipePool?.map((r) => r.title)).toEqual([
      'Grilled Chicken Italian',
      'Grilled Chicken Japanese',
      'Grilled Chicken Mexican',
    ]);
    expect(card?.recipeIndex).toBe(0);
    expect(card?.recipeRationale).toMatch(/paprika/i);

    // Swap once → Japanese
    act(() => {
      result.current.swapToNextAlternate(card!.id);
    });
    const after1 = result.current.messages.at(-1);
    expect(after1?.recipe?.title).toBe('Grilled Chicken Japanese');
    expect(after1?.recipeIndex).toBe(1);

    // Swap twice more → Mexican, then wraps to Italian
    act(() => {
      result.current.swapToNextAlternate(card!.id);
    });
    expect(result.current.messages.at(-1)?.recipe?.title).toBe(
      'Grilled Chicken Mexican',
    );
    act(() => {
      result.current.swapToNextAlternate(card!.id);
    });
    expect(result.current.messages.at(-1)?.recipe?.title).toBe(
      'Grilled Chicken Italian',
    );
    expect(result.current.messages.at(-1)?.recipeIndex).toBe(0);
  });

  it('swapToNextAlternate is a no-op for length-1 pools (AI-gen-only result)', async () => {
    mockedDetect.mockReturnValue({ query: 'pizza margarita' });
    mockedFindOrGenerate.mockResolvedValueOnce({
      primary: {
        title: 'Pizza Margherita',
        description: '',
        baseServings: 2,
        ingredients: [{ name: 'flour', amount: 1, unit: 'cup' }],
        steps: ['Mix.'],
      },
      alternates: [],
    });

    const { result } = renderHook(() => useCoachStream());

    await act(async () => {
      await result.current.sendMessage('pizza margarita');
    });
    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    const card = result.current.messages.at(-1);
    expect(card?.recipePool?.length).toBe(1);

    act(() => {
      result.current.swapToNextAlternate(card!.id);
    });
    // Index stays at 0; recipe unchanged.
    expect(result.current.messages.at(-1)?.recipeIndex).toBe(0);
    expect(result.current.messages.at(-1)?.recipe?.title).toBe('Pizza Margherita');
  });
});
