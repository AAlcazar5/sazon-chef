// Tier Y N=1 ranker depth (founder Telegram 2026-05-20): the wedge
// ranker needs a "what cuisines does this user actually save" signal
// — explicit user action is a stronger N=1 signal than server-inferred
// adjacency or last-cook recency. RED-first: hook doesn't exist yet.

jest.mock('../../lib/api', () => ({
  recipeApi: { getSavedRecipes: jest.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { recipeApi } from '../../lib/api';
import { aggregateCuisinesFromSaved, useSavedRecipeCuisines } from '../../hooks/useSavedRecipeCuisines';

const mockGetSavedRecipes = recipeApi.getSavedRecipes as jest.Mock;

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

describe('aggregateCuisinesFromSaved (pure)', () => {
  it('returns cuisines sorted by frequency (descending)', () => {
    const saved = [
      { recipe: { cuisine: 'Italian' } },
      { recipe: { cuisine: 'Mexican' } },
      { recipe: { cuisine: 'Italian' } },
      { recipe: { cuisine: 'Thai' } },
      { recipe: { cuisine: 'Italian' } },
      { recipe: { cuisine: 'Mexican' } },
    ];
    expect(aggregateCuisinesFromSaved(saved)).toEqual(['Italian', 'Mexican', 'Thai']);
  });

  it('handles flat {cuisine} entries (legacy shape) as well as nested {recipe.cuisine}', () => {
    const mixed = [
      { recipe: { cuisine: 'Persian' } },
      { cuisine: 'Persian' },
      { recipe: { cuisine: 'Japanese' } },
    ];
    expect(aggregateCuisinesFromSaved(mixed)).toEqual(['Persian', 'Japanese']);
  });

  it('ignores rows with missing / empty / non-string cuisine', () => {
    const messy = [
      { recipe: { cuisine: 'Italian' } },
      { recipe: { cuisine: '' } },
      { recipe: { cuisine: null } },
      { recipe: {} },
      { recipe: { cuisine: 42 } },
    ];
    expect(aggregateCuisinesFromSaved(messy as any)).toEqual(['Italian']);
  });

  it('returns [] for empty input', () => {
    expect(aggregateCuisinesFromSaved([])).toEqual([]);
  });

  it('is case-stable: aggregates by lowercased key but returns canonical-cased label', () => {
    const saved = [
      { recipe: { cuisine: 'italian' } },
      { recipe: { cuisine: 'Italian' } },
      { recipe: { cuisine: 'ITALIAN' } },
    ];
    // Stable order: first canonical spelling wins as the label; count = 3.
    const out = aggregateCuisinesFromSaved(saved);
    expect(out).toHaveLength(1);
    expect(out[0].toLowerCase()).toBe('italian');
  });
});

describe('useSavedRecipeCuisines (hook)', () => {
  it('returns aggregated cuisines from getSavedRecipes', async () => {
    mockGetSavedRecipes.mockResolvedValueOnce({
      data: {
        recipes: [
          { recipe: { cuisine: 'Italian' } },
          { recipe: { cuisine: 'Mexican' } },
          { recipe: { cuisine: 'Italian' } },
        ],
      },
    });
    const { result } = renderHook(() => useSavedRecipeCuisines(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.cuisines).toEqual(['Italian', 'Mexican']);
    });
  });

  it('handles array-at-data-root shape (unwrapped by core interceptor)', async () => {
    mockGetSavedRecipes.mockResolvedValueOnce({
      data: [
        { recipe: { cuisine: 'Thai' } },
        { recipe: { cuisine: 'Thai' } },
        { recipe: { cuisine: 'Indian' } },
      ],
    });
    const { result } = renderHook(() => useSavedRecipeCuisines(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.cuisines).toEqual(['Thai', 'Indian']);
    });
  });

  it('returns [] on API error (never throws into the ranker)', async () => {
    mockGetSavedRecipes.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useSavedRecipeCuisines(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.cuisines).toEqual([]);
  });

  it('returns [] while loading (no flicker into the ranker)', () => {
    mockGetSavedRecipes.mockReturnValueOnce(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useSavedRecipeCuisines(), {
      wrapper: makeWrapper(),
    });
    expect(result.current.cuisines).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});
