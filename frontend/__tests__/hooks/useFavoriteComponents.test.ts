// frontend/__tests__/hooks/useFavoriteComponents.test.ts
// Group 10X Phase 4 — slot affinity favorites hook unit tests.

jest.mock('../../lib/api', () => ({
  mealComponentApi: {
    affinity: jest.fn(),
  },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import useFavoriteComponents, { __resetAffinityCache } from '../../hooks/useFavoriteComponents';
import { mealComponentApi } from '../../lib/api';

const mockAffinity = mealComponentApi.affinity as jest.Mock;

const AFFINITY_RESPONSE = {
  data: {
    slot: 'protein',
    favorites: [
      { componentId: 'salmon', score: 1.5 },
      { componentId: 'chicken', score: 0.8 },
    ],
  },
};

describe('useFavoriteComponents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAffinityCache();
    mockAffinity.mockResolvedValue(AFFINITY_RESPONSE);
  });

  it('calls mealComponentApi.affinity once on mount with the given slot', async () => {
    const { result } = renderHook(() => useFavoriteComponents('protein'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockAffinity).toHaveBeenCalledTimes(1);
    expect(mockAffinity).toHaveBeenCalledWith({ slot: 'protein', limit: 20 });
  });

  it('returns favoriteIds Set populated from API response', async () => {
    const { result } = renderHook(() => useFavoriteComponents('protein'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.favoriteIds.has('salmon')).toBe(true);
    expect(result.current.favoriteIds.has('chicken')).toBe(true);
    expect(result.current.favoriteIds.has('tofu')).toBe(false);
  });

  it('returns scoresById Map with correct values', async () => {
    const { result } = renderHook(() => useFavoriteComponents('protein'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.scoresById.get('salmon')).toBe(1.5);
    expect(result.current.scoresById.get('chicken')).toBe(0.8);
  });

  it('returns empty set and map when API errors', async () => {
    mockAffinity.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useFavoriteComponents('protein'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.favoriteIds.size).toBe(0);
    expect(result.current.scoresById.size).toBe(0);
  });

  it('starts with loading=true then resolves to loading=false', async () => {
    let resolve!: (v: any) => void;
    mockAffinity.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => useFavoriteComponents('protein'));
    expect(result.current.loading).toBe(true);
    await act(async () => { resolve(AFFINITY_RESPONSE); });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('caches per slot — second mount with same slot does not re-fetch', async () => {
    const { unmount } = renderHook(() => useFavoriteComponents('protein'));
    await waitFor(() => expect(mockAffinity).toHaveBeenCalledTimes(1));
    unmount();

    mockAffinity.mockClear();
    const { result } = renderHook(() => useFavoriteComponents('protein'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockAffinity).toHaveBeenCalledTimes(0);
    expect(result.current.favoriteIds.has('salmon')).toBe(true);
  });

  it('fetches again for a different slot', async () => {
    mockAffinity.mockResolvedValue({
      data: { slot: 'base', favorites: [{ componentId: 'farro', score: 1.2 }] },
    });
    const { result } = renderHook(() => useFavoriteComponents('base'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockAffinity).toHaveBeenCalledWith({ slot: 'base', limit: 20 });
    expect(result.current.favoriteIds.has('farro')).toBe(true);
  });
});
