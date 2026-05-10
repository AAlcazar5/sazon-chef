// P5: useSkillTier migrated to React Query.

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSkillTier = jest.fn();

jest.mock('../../lib/api', () => ({
  mealComponentApi: {
    skillTier: () => mockSkillTier(),
  },
}));

import useSkillTier from '../../hooks/useSkillTier';

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
}

function withClient(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useSkillTier (P5)', () => {
  beforeEach(() => {
    mockSkillTier.mockReset();
  });

  it('starts on default tier "cook" and resolves to the fetched tier', async () => {
    mockSkillTier.mockResolvedValue({ data: { tier: 'chef' } });
    const { result } = renderHook(() => useSkillTier(), {
      wrapper: withClient(makeClient()),
    });
    expect(result.current.tier).toBe('cook');
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe('chef');
    expect(result.current.isSauceVisible).toBe(true);
    expect(result.current.isVariantChipsVisible).toBe(true);
  });

  it('isSauceVisible is false for beginner', async () => {
    mockSkillTier.mockResolvedValue({ data: { tier: 'beginner' } });
    const { result } = renderHook(() => useSkillTier(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.tier).toBe('beginner'));
    expect(result.current.isSauceVisible).toBe(false);
    expect(result.current.isVariantChipsVisible).toBe(false);
  });

  it('falls back to default "cook" on API error', async () => {
    mockSkillTier.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSkillTier(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe('cook');
  });

  it('ignores unknown tier values from the API', async () => {
    mockSkillTier.mockResolvedValue({ data: { tier: 'wizard' } });
    const { result } = renderHook(() => useSkillTier(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe('cook');
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockSkillTier.mockResolvedValue({ data: { tier: 'chef' } });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useSkillTier(), { wrapper });
    const b = renderHook(() => useSkillTier(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });
    expect(mockSkillTier).toHaveBeenCalledTimes(1);
  });
});
