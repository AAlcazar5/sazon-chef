// frontend/__tests__/components/build-a-plate/SkillTierGating.test.tsx
// Group 10X Phase 9 — useSkillTier hook + SkillTierBoundary collapse behavior.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

jest.mock('../../../lib/api', () => ({
  mealComponentApi: {
    skillTier: jest.fn(),
  },
}));

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useSkillTier from '../../../hooks/useSkillTier';
import { mealComponentApi } from '../../../lib/api';

const mockSkillTier = mealComponentApi.skillTier as jest.Mock;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useSkillTier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns "cook" tier with sauce visible when API returns cook tier', async () => {
    mockSkillTier.mockResolvedValue({
      data: { tier: 'cook', visibleSlots: ['protein', 'base', 'vegetable', 'sauce'] },
    });

    const { result } = renderHook(() => useSkillTier(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.tier).toBe('cook'));
    expect(result.current.isSauceVisible).toBe(true);
    expect(result.current.isVariantChipsVisible).toBe(false);
  });

  it('hides sauce slot when tier is "beginner"', async () => {
    mockSkillTier.mockResolvedValue({
      data: { tier: 'beginner', visibleSlots: ['protein', 'base', 'vegetable'] },
    });

    const { result } = renderHook(() => useSkillTier(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.tier).toBe('beginner'));
    expect(result.current.isSauceVisible).toBe(false);
    expect(result.current.isVariantChipsVisible).toBe(false);
  });

  it('shows variant chips for "chef" tier', async () => {
    mockSkillTier.mockResolvedValue({
      data: { tier: 'chef', visibleSlots: ['protein', 'base', 'vegetable', 'sauce', 'garnish'] },
    });

    const { result } = renderHook(() => useSkillTier(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.tier).toBe('chef'));
    expect(result.current.isSauceVisible).toBe(true);
    expect(result.current.isVariantChipsVisible).toBe(true);
  });

  it('falls back to cook tier when API errors', async () => {
    mockSkillTier.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useSkillTier(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.tier).toBe('cook'));
    expect(result.current.isSauceVisible).toBe(true);
  });
});
