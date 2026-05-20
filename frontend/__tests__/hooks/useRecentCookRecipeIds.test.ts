// Tier Y N=1 ranker depth PR-3: the wedge should not keep surfacing the
// same recipe the user just cooked. This hook extracts recipe IDs from
// the /cooking-logs/most-recent endpoint and feeds them into the ranker
// as a multiplicative damper (recent → slight downrank). RED-first:
// hook doesn't exist yet, extractor tested in isolation.

jest.mock('../../lib/api', () => ({
  cookingHistoryStatsApi: { mostRecent: jest.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { cookingHistoryStatsApi } from '../../lib/api';
import {
  extractRecentCookRecipeIds,
  useRecentCookRecipeIds,
} from '../../hooks/useRecentCookRecipeIds';

const mockMostRecent = cookingHistoryStatsApi.mostRecent as jest.Mock;

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

describe('extractRecentCookRecipeIds (pure)', () => {
  it('extracts the recipe id from a real response shape', () => {
    expect(
      extractRecentCookRecipeIds({
        data: {
          mostRecent: {
            cookedAt: '2026-05-20T00:00:00Z',
            recipe: { id: 'rcp_grilled_italian', title: 'X', cuisine: 'Italian' },
          },
        },
      }),
    ).toEqual(['rcp_grilled_italian']);
  });

  it('returns [] when mostRecent is null (user has never cooked)', () => {
    expect(extractRecentCookRecipeIds({ data: { mostRecent: null } })).toEqual([]);
  });

  it('returns [] when recipe has no id', () => {
    expect(
      extractRecentCookRecipeIds({
        data: { mostRecent: { recipe: { title: 'orphan' } } },
      }),
    ).toEqual([]);
  });

  it('returns [] for garbage input', () => {
    expect(extractRecentCookRecipeIds(null)).toEqual([]);
    expect(extractRecentCookRecipeIds(undefined)).toEqual([]);
    expect(extractRecentCookRecipeIds({ data: {} })).toEqual([]);
  });
});

describe('useRecentCookRecipeIds (hook)', () => {
  it('returns the most-recent recipe id when the cook log has one', async () => {
    mockMostRecent.mockResolvedValueOnce({
      data: {
        mostRecent: {
          cookedAt: '2026-05-20T00:00:00Z',
          recipe: { id: 'rcp_grilled_italian', cuisine: 'Italian' },
        },
      },
    });
    const { result } = renderHook(() => useRecentCookRecipeIds(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.ids).toEqual(['rcp_grilled_italian']);
    });
  });

  it('returns [] when the user has no cook log yet', async () => {
    mockMostRecent.mockResolvedValueOnce({ data: { mostRecent: null } });
    const { result } = renderHook(() => useRecentCookRecipeIds(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.ids).toEqual([]);
  });

  it('returns [] on API error (ranker degrades to no signal)', async () => {
    mockMostRecent.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useRecentCookRecipeIds(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.ids).toEqual([]);
  });
});
