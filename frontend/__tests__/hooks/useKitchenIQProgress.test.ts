// Group 10S: useKitchenIQProgress hook tests.

const memStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(memStore[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => {
    memStore[k] = v;
    return Promise.resolve();
  }),
  removeItem: jest.fn((k: string) => {
    delete memStore[k];
    return Promise.resolve();
  }),
}));

jest.mock('../../lib/api', () => ({
  userApi: {
    getKitchenIQProgress: jest.fn(),
  },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { userApi } from '../../lib/api';
import {
  useKitchenIQProgress,
  __resetKitchenIQCelebrationsForTests,
} from '../../hooks/useKitchenIQProgress';

const mockedGet = userApi.getKitchenIQProgress as jest.MockedFunction<
  typeof userApi.getKitchenIQProgress
>;

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(memStore)) delete memStore[k];
  __resetKitchenIQCelebrationsForTests();
});

describe('useKitchenIQProgress', () => {
  it('starts in loading state and fetches progress on mount', async () => {
    mockedGet.mockResolvedValue({
      data: {
        totalCards: 32,
        unlockedCount: 3,
        unlockedIds: ['nut-protein', 'con-volume-eating', 'con-reading-labels'],
        newUnlocks: [],
      },
    } as any);

    const { result } = renderHook(() => useKitchenIQProgress());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totalCards).toBe(32);
    expect(result.current.unlockedCount).toBe(3);
    expect(result.current.unlockedIds).toContain('nut-protein');
  });

  it('isUnlocked(id) returns true for unlocked cards and false otherwise', async () => {
    mockedGet.mockResolvedValue({
      data: {
        totalCards: 32,
        unlockedCount: 3,
        unlockedIds: ['nut-protein', 'con-volume-eating', 'con-reading-labels'],
        newUnlocks: [],
      },
    } as any);

    const { result } = renderHook(() => useKitchenIQProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isUnlocked('nut-protein')).toBe(true);
    expect(result.current.isUnlocked('nut-iron')).toBe(false);
  });

  it('exposes newUnlocks for the celebration system', async () => {
    mockedGet.mockResolvedValue({
      data: {
        totalCards: 32,
        unlockedCount: 5,
        unlockedIds: ['nut-protein', 'con-volume-eating', 'con-reading-labels', 'nut-magnesium', 'nut-fiber'],
        newUnlocks: ['nut-magnesium', 'nut-fiber'],
      },
    } as any);

    const { result } = renderHook(() => useKitchenIQProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.newUnlocks).toEqual(['nut-magnesium', 'nut-fiber']);
  });

  it('acknowledgeNewUnlock(id) removes it from newUnlocks and persists the seen flag', async () => {
    mockedGet.mockResolvedValue({
      data: {
        totalCards: 32,
        unlockedCount: 4,
        unlockedIds: ['nut-protein', 'con-volume-eating', 'con-reading-labels', 'nut-magnesium'],
        newUnlocks: ['nut-magnesium'],
      },
    } as any);

    const { result } = renderHook(() => useKitchenIQProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.newUnlocks).toContain('nut-magnesium');

    await act(async () => {
      await result.current.acknowledgeNewUnlock('nut-magnesium');
    });

    expect(result.current.newUnlocks).not.toContain('nut-magnesium');
    expect(memStore['kitchen_iq_celebrated_v1']).toBeDefined();
    const persisted = JSON.parse(memStore['kitchen_iq_celebrated_v1']);
    expect(persisted).toContain('nut-magnesium');
  });

  it('falls back gracefully on fetch error (loading: false, empty unlocked, error set)', async () => {
    mockedGet.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useKitchenIQProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.unlockedIds).toEqual([]);
  });

  it('refresh re-fetches progress', async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: {
          totalCards: 32,
          unlockedCount: 3,
          unlockedIds: ['nut-protein', 'con-volume-eating', 'con-reading-labels'],
          newUnlocks: [],
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          totalCards: 32,
          unlockedCount: 4,
          unlockedIds: ['nut-protein', 'con-volume-eating', 'con-reading-labels', 'nut-magnesium'],
          newUnlocks: ['nut-magnesium'],
        },
      } as any);

    const { result } = renderHook(() => useKitchenIQProgress());
    await waitFor(() => expect(result.current.unlockedCount).toBe(3));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.unlockedCount).toBe(4);
    expect(result.current.newUnlocks).toContain('nut-magnesium');
  });
});
