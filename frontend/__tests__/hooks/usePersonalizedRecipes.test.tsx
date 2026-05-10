// frontend/__tests__/hooks/usePersonalizedRecipes.test.tsx
// P5 (cleanup): the API-fetching path was unused; the hook now manages
// only the recently-viewed list (AsyncStorage-backed). Tests assert the
// move-to-front semantics + 5-item cap + graceful error handling.

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePersonalizedRecipes } from '../../hooks/usePersonalizedRecipes';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('usePersonalizedRecipes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItem.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValue(null);
  });

  it('hydrates recentlyViewedIds from AsyncStorage on mount', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(['a', 'b', 'c']));
    const { result } = renderHook(() => usePersonalizedRecipes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recentlyViewedIds).toEqual(['a', 'b', 'c']);
  });

  it('caps to 5 items on hydration', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(['a', 'b', 'c', 'd', 'e', 'f', 'g']));
    const { result } = renderHook(() => usePersonalizedRecipes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recentlyViewedIds).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('returns empty list when AsyncStorage is empty', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => usePersonalizedRecipes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recentlyViewedIds).toEqual([]);
  });

  it('addRecentlyViewed prepends new id and caps to 5', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockGetItem.mockResolvedValue(JSON.stringify(['a', 'b', 'c', 'd', 'e']));
    const { result } = renderHook(() => usePersonalizedRecipes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addRecentlyViewed('NEW');
    });

    expect(result.current.recentlyViewedIds).toEqual(['NEW', 'a', 'b', 'c', 'd']);
    expect(mockSetItem).toHaveBeenCalledWith(
      '@sazon_recently_viewed',
      JSON.stringify(['NEW', 'a', 'b', 'c', 'd']),
    );
  });

  it('addRecentlyViewed moves an existing id to the front (no dup)', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockGetItem.mockResolvedValue(JSON.stringify(['a', 'b', 'c']));
    const { result } = renderHook(() => usePersonalizedRecipes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addRecentlyViewed('b');
    });

    expect(result.current.recentlyViewedIds).toEqual(['b', 'a', 'c']);
  });

  it('survives AsyncStorage read failure', async () => {
    mockGetItem.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePersonalizedRecipes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recentlyViewedIds).toEqual([]);
  });
});
