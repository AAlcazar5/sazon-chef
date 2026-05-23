// Y-Rank-5 (founder roadmap Telegram 2026-05-20) — liked-recipes
// signal for the wedge ranker. Tests mirror the useRecentCookRecipeIds
// pattern: pure extractor + React-Query hook + empty + error paths.

jest.mock('../../lib/api/recipe', () => ({
  recipeApi: { getLikedRecipes: jest.fn() },
}));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { recipeApi } from '../../lib/api/recipe';
import {
  extractLikedRecipeIds,
  useLikedRecipeIds,
} from '../../hooks/useLikedRecipeIds';

const mockGetLiked = recipeApi.getLikedRecipes as jest.Mock;

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('extractLikedRecipeIds (pure)', () => {
  it('extracts ids from { data: { recipes: [{ id }] } } shape', () => {
    expect(
      extractLikedRecipeIds({
        data: {
          recipes: [
            { id: 'r1', title: 'Pomodoro' },
            { id: 'r2', title: 'Carbonara' },
          ],
        },
      }),
    ).toEqual(['r1', 'r2']);
  });

  it('extracts ids from { data: { recipes: [{ recipe: { id } }] } } join shape', () => {
    expect(
      extractLikedRecipeIds({
        data: {
          recipes: [
            { recipe: { id: 'r3', title: 'Ramen' } },
            { recipe: { id: 'r4', title: 'Pad Thai' } },
          ],
        },
      }),
    ).toEqual(['r3', 'r4']);
  });

  it('extracts ids from a bare array shape', () => {
    expect(
      extractLikedRecipeIds({ data: [{ id: 'r5' }, { id: 'r6' }] }),
    ).toEqual(['r5', 'r6']);
  });

  it('dedupes repeated ids (defense against backend pagination overlap)', () => {
    expect(
      extractLikedRecipeIds({
        data: { recipes: [{ id: 'r1' }, { id: 'r2' }, { id: 'r1' }] },
      }),
    ).toEqual(['r1', 'r2']);
  });

  it('returns [] on empty list', () => {
    expect(extractLikedRecipeIds({ data: { recipes: [] } })).toEqual([]);
  });

  it('returns [] on missing data', () => {
    expect(extractLikedRecipeIds({})).toEqual([]);
    expect(extractLikedRecipeIds(null)).toEqual([]);
    expect(extractLikedRecipeIds(undefined)).toEqual([]);
  });

  it('skips entries with missing/empty ids', () => {
    expect(
      extractLikedRecipeIds({
        data: { recipes: [{ id: '' }, { title: 'no id' }, { id: 'r9' }] },
      }),
    ).toEqual(['r9']);
  });
});

describe('useLikedRecipeIds (hook)', () => {
  it('fetches + returns the extracted ids on success', async () => {
    mockGetLiked.mockResolvedValue({
      data: { recipes: [{ id: 'r1' }, { id: 'r2' }] },
    });
    const { result } = renderHook(() => useLikedRecipeIds(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.ids).toEqual(['r1', 'r2']));
    expect(result.current.loading).toBe(false);
    expect(mockGetLiked).toHaveBeenCalledWith({ limit: expect.any(Number) });
  });

  it('returns [] silently on API error (ranker never throws on missing signals)', async () => {
    mockGetLiked.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useLikedRecipeIds(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ids).toEqual([]);
  });

  it('returns [] when the API resolves with an empty list', async () => {
    mockGetLiked.mockResolvedValue({ data: { recipes: [] } });
    const { result } = renderHook(() => useLikedRecipeIds(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ids).toEqual([]);
  });
});
