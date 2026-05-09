// frontend/__tests__/hooks/useDailyCheckInGate.test.ts
// ROADMAP 4.0 Tier C7 — once-per-day gate behavior.

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  useDailyCheckInGate,
  __DAILY_CHECKIN_STORAGE_KEY,
} from '../../hooks/useDailyCheckInGate';

function todayLocalISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

describe('useDailyCheckInGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItem.mockResolvedValue(undefined);
  });

  it('returns shouldShow=null while hydrating from storage', () => {
    mockGetItem.mockReturnValue(new Promise(() => { /* never resolves */ }));
    const { result } = renderHook(() => useDailyCheckInGate());
    expect(result.current.shouldShow).toBeNull();
  });

  it('returns shouldShow=true when storage has never been written', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useDailyCheckInGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
  });

  it('returns shouldShow=false when storage has today\'s date', async () => {
    mockGetItem.mockResolvedValue(todayLocalISO());
    const { result } = renderHook(() => useDailyCheckInGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(false));
  });

  it('returns shouldShow=true when storage has yesterday\'s date', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    mockGetItem.mockResolvedValue(yesterdayISO);
    const { result } = renderHook(() => useDailyCheckInGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
  });

  it('treats storage errors as "show today" (best-effort, never block UX)', async () => {
    mockGetItem.mockRejectedValue(new Error('storage unavailable'));
    const { result } = renderHook(() => useDailyCheckInGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
  });

  it('dismiss() flips shouldShow to false and persists today\'s date', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useDailyCheckInGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));

    await act(async () => {
      await result.current.dismiss();
    });

    expect(result.current.shouldShow).toBe(false);
    expect(mockSetItem).toHaveBeenCalledWith(
      __DAILY_CHECKIN_STORAGE_KEY,
      todayLocalISO(),
    );
  });

  it('dismiss() swallows storage errors (UX never blocks on persistence)', async () => {
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockRejectedValueOnce(new Error('disk full'));
    const { result } = renderHook(() => useDailyCheckInGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));

    // Should not throw.
    await act(async () => {
      await result.current.dismiss();
    });

    // Even though persistence failed, the in-memory state still flips so
    // the card disappears for the rest of the session.
    expect(result.current.shouldShow).toBe(false);
  });
});
