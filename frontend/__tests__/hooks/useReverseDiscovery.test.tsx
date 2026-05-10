// I2.4 — useReverseDiscovery hook tests.
// P5: wrapped renderHook in QueryClientProvider after migration.

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReverseDiscovery } from '../../hooks/useReverseDiscovery';
import { todayApi } from '../../lib/api';

jest.mock('../../lib/api', () => ({
  todayApi: {
    reverseDiscovery: jest.fn(),
  },
}));

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

describe('useReverseDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in loading state with empty payload', () => {
    (todayApi.reverseDiscovery as jest.Mock).mockResolvedValue({
      data: { candidate: null, copy: null },
    });
    const { result } = renderHook(() => useReverseDiscovery(), {
      wrapper: withClient(makeClient()),
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.payload).toEqual({ candidate: null, copy: null });
  });

  it('settles with the API payload after fetch', async () => {
    const populated = {
      candidate: {
        canonical: 'cassava',
        locale: 'pt-BR',
        localName: 'mandioca',
        availabilityTier: 'common' as const,
        notes: null,
      },
      copy: {
        eyebrow: 'YOUR MARKET HAS',
        headline: 'mandioca',
        body: 'Local kitchens cook with this all the time.',
        cta: 'Show me how',
      },
    };
    (todayApi.reverseDiscovery as jest.Mock).mockResolvedValue({
      data: populated,
    });
    const { result } = renderHook(() => useReverseDiscovery(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.payload).toEqual(populated);
    expect(result.current.error).toBeNull();
  });

  it('falls back to empty payload + sets error on API failure', async () => {
    (todayApi.reverseDiscovery as jest.Mock).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useReverseDiscovery(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.payload).toEqual({ candidate: null, copy: null });
    expect(result.current.error?.message).toBe('boom');
  });

  it('passes through null candidate (en-US users)', async () => {
    (todayApi.reverseDiscovery as jest.Mock).mockResolvedValue({
      data: { candidate: null, copy: null },
    });
    const { result } = renderHook(() => useReverseDiscovery(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.payload.candidate).toBeNull();
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    (todayApi.reverseDiscovery as jest.Mock).mockResolvedValue({
      data: { candidate: null, copy: null },
    });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useReverseDiscovery(), { wrapper });
    const b = renderHook(() => useReverseDiscovery(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });
    expect((todayApi.reverseDiscovery as jest.Mock)).toHaveBeenCalledTimes(1);
  });
});
