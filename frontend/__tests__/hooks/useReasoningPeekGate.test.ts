// ROADMAP 4.0 HX2.4 — useReasoningPeekGate tests.

const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, val: string) => {
    mockStorage[key] = val;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useReasoningPeekGate } from '../../hooks/useReasoningPeekGate';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

describe('useReasoningPeekGate (HX2.4)', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it('cold-start: showPeek=true after hydration', async () => {
    const { result } = renderHook(() => useReasoningPeekGate());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.showPeek).toBe(true);
  });

  it('after dismissPeek, showPeek=false + persisted', async () => {
    const { result } = renderHook(() => useReasoningPeekGate());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.dismissPeek();
    });
    expect(result.current.showPeek).toBe(false);
    expect(mockStorage['reasoningPeekDismissedOn:v1']).toBe(todayKey());
  });

  it('a previously-dismissed day still hides the peek', async () => {
    mockStorage['reasoningPeekDismissedOn:v1'] = todayKey();
    const { result } = renderHook(() => useReasoningPeekGate());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.showPeek).toBe(false);
  });

  it('a dismiss from a previous day re-enables the peek today', async () => {
    mockStorage['reasoningPeekDismissedOn:v1'] = '1999-01-01';
    const { result } = renderHook(() => useReasoningPeekGate());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.showPeek).toBe(true);
  });
});
