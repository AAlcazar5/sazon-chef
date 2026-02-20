// frontend/__tests__/hooks/useSearchHistory.test.ts

// Mock AsyncStorage
const mockAsyncStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockAsyncStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockAsyncStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockAsyncStorage[key];
    return Promise.resolve();
  }),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useSearchHistory } from '../../hooks/useSearchHistory';

const AsyncStorage = require('@react-native-async-storage/async-storage');

describe('useSearchHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockAsyncStorage).forEach(key => delete mockAsyncStorage[key]);
  });

  it('should initialize with empty search history', () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.searchHistory).toEqual([]);
  });

  it('should load history from AsyncStorage on mount', async () => {
    mockAsyncStorage['recipe_search_history'] = JSON.stringify(['chicken', 'pasta', 'salad']);

    const { result } = renderHook(() => useSearchHistory());

    // Wait for the async effect to resolve
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.searchHistory).toEqual(['chicken', 'pasta', 'salad']);
  });

  it('should add a search query to history', async () => {
    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await result.current.addToHistory('chicken tacos');
    });

    expect(result.current.searchHistory).toContain('chicken tacos');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'recipe_search_history',
      expect.stringContaining('chicken tacos')
    );
  });

  it('should not add empty or whitespace-only queries', async () => {
    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await result.current.addToHistory('');
    });

    expect(result.current.searchHistory).toEqual([]);

    await act(async () => {
      await result.current.addToHistory('   ');
    });

    expect(result.current.searchHistory).toEqual([]);
  });

  it('should move duplicate queries to the top', async () => {
    mockAsyncStorage['recipe_search_history'] = JSON.stringify(['pasta', 'chicken', 'salad']);

    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result.current.addToHistory('chicken');
    });

    expect(result.current.searchHistory[0]).toBe('chicken');
  });

  it('should handle case-insensitive deduplication', async () => {
    mockAsyncStorage['recipe_search_history'] = JSON.stringify(['Chicken']);

    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result.current.addToHistory('chicken');
    });

    const chickenEntries = result.current.searchHistory.filter(
      (q: string) => q.toLowerCase() === 'chicken'
    );
    expect(chickenEntries.length).toBe(1);
  });

  it('should limit history to 10 items', async () => {
    const existingHistory = Array.from({ length: 10 }, (_, i) => `recipe ${i}`);
    mockAsyncStorage['recipe_search_history'] = JSON.stringify(existingHistory);

    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result.current.addToHistory('new recipe');
    });

    expect(result.current.searchHistory.length).toBeLessThanOrEqual(10);
    expect(result.current.searchHistory[0]).toBe('new recipe');
  });

  it('should remove a specific query from history', async () => {
    mockAsyncStorage['recipe_search_history'] = JSON.stringify(['chicken', 'pasta', 'salad']);

    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result.current.removeFromHistory('pasta');
    });

    expect(result.current.searchHistory).not.toContain('pasta');
    expect(result.current.searchHistory).toContain('chicken');
    expect(result.current.searchHistory).toContain('salad');
  });

  it('should clear all history', async () => {
    mockAsyncStorage['recipe_search_history'] = JSON.stringify(['chicken', 'pasta', 'salad']);

    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result.current.clearHistory();
    });

    expect(result.current.searchHistory).toEqual([]);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('recipe_search_history');
  });

  it('should handle AsyncStorage errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.searchHistory).toEqual([]);
    consoleSpy.mockRestore();
  });
});
