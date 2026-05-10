// frontend/__tests__/hooks/useLeftoverInventory.test.tsx
// Group 10X Phase 6 — leftover inventory hook unit tests.
// P5: wrapped renderHook in QueryClientProvider after the hook migrated to React Query.

jest.mock('../../lib/api', () => ({
  leftoverInventoryApi: {
    list: jest.fn(),
  },
}));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { leftoverInventoryApi } from '../../lib/api';
import { useLeftoverInventory } from '../../hooks/useLeftoverInventory';

const mockList = leftoverInventoryApi.list as jest.Mock;

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

function withClient(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const SALMON_LEFTOVER = {
  id: 'lo-salmon',
  componentId: 'salmon-c',
  name: 'Salmon',
  slot: 'protein',
  portionsRemaining: 1,
  expiresAt: new Date(Date.now() + 86400000 * 2).toISOString(),
};

const FARRO_LEFTOVER = {
  id: 'lo-farro',
  componentId: 'farro-c',
  name: 'Farro',
  slot: 'base',
  portionsRemaining: 1,
  expiresAt: new Date(Date.now() + 86400000 * 4).toISOString(),
};

describe('useLeftoverInventory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls leftoverInventoryApi.list once on mount', async () => {
    mockList.mockResolvedValue({ data: { leftovers: [] } });
    renderHook(() => useLeftoverInventory(), { wrapper: withClient(makeClient()) });
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
  });

  it('returns leftovers from API response', async () => {
    mockList.mockResolvedValue({
      data: { leftovers: [SALMON_LEFTOVER, FARRO_LEFTOVER] },
    });
    const { result } = renderHook(() => useLeftoverInventory(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.leftovers).toHaveLength(2);
    expect(result.current.leftovers[0].name).toBe('Salmon');
  });

  it('hasEnoughForStretch is true when leftovers.length >= 2', async () => {
    mockList.mockResolvedValue({
      data: { leftovers: [SALMON_LEFTOVER, FARRO_LEFTOVER] },
    });
    const { result } = renderHook(() => useLeftoverInventory(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasEnoughForStretch).toBe(true);
  });

  it('hasEnoughForStretch is false when leftovers.length < 2', async () => {
    mockList.mockResolvedValue({ data: { leftovers: [SALMON_LEFTOVER] } });
    const { result } = renderHook(() => useLeftoverInventory(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasEnoughForStretch).toBe(false);
  });

  it('hasEnoughForStretch is false when leftovers list is empty', async () => {
    mockList.mockResolvedValue({ data: { leftovers: [] } });
    const { result } = renderHook(() => useLeftoverInventory(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasEnoughForStretch).toBe(false);
  });

  it('handles API error gracefully — returns empty leftovers', async () => {
    mockList.mockRejectedValue(new Error('Network down'));
    const { result } = renderHook(() => useLeftoverInventory(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.leftovers).toEqual([]);
    expect(result.current.hasEnoughForStretch).toBe(false);
  });

  it('starts with isLoading=true then resolves to false', async () => {
    let resolve!: (v: any) => void;
    mockList.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => useLeftoverInventory(), {
      wrapper: withClient(makeClient()),
    });
    expect(result.current.isLoading).toBe(true);
    resolve({ data: { leftovers: [] } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockList.mockResolvedValue({ data: { leftovers: [SALMON_LEFTOVER] } });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useLeftoverInventory(), { wrapper });
    const b = renderHook(() => useLeftoverInventory(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.isLoading).toBe(false);
      expect(b.result.current.isLoading).toBe(false);
    });
    expect(mockList).toHaveBeenCalledTimes(1);
  });
});
