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

import { renderHook, waitFor, act } from '@testing-library/react-native';
import useSkillTier from '../../../hooks/useSkillTier';
import { mealComponentApi } from '../../../lib/api';

const mockSkillTier = mealComponentApi.skillTier as jest.Mock;

describe('useSkillTier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns "cook" tier with sauce visible when API returns cook tier', async () => {
    mockSkillTier.mockResolvedValue({
      data: { tier: 'cook', visibleSlots: ['protein', 'base', 'vegetable', 'sauce'] },
    });

    const { result } = renderHook(() => useSkillTier());

    await waitFor(() => expect(result.current.tier).toBe('cook'));
    expect(result.current.isSauceVisible).toBe(true);
    expect(result.current.isVariantChipsVisible).toBe(false);
  });

  it('hides sauce slot when tier is "beginner"', async () => {
    mockSkillTier.mockResolvedValue({
      data: { tier: 'beginner', visibleSlots: ['protein', 'base', 'vegetable'] },
    });

    const { result } = renderHook(() => useSkillTier());

    await waitFor(() => expect(result.current.tier).toBe('beginner'));
    expect(result.current.isSauceVisible).toBe(false);
    expect(result.current.isVariantChipsVisible).toBe(false);
  });

  it('shows variant chips for "chef" tier', async () => {
    mockSkillTier.mockResolvedValue({
      data: { tier: 'chef', visibleSlots: ['protein', 'base', 'vegetable', 'sauce', 'garnish'] },
    });

    const { result } = renderHook(() => useSkillTier());

    await waitFor(() => expect(result.current.tier).toBe('chef'));
    expect(result.current.isSauceVisible).toBe(true);
    expect(result.current.isVariantChipsVisible).toBe(true);
  });

  it('falls back to cook tier when API errors', async () => {
    mockSkillTier.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useSkillTier());

    await waitFor(() => expect(result.current.tier).toBe('cook'));
    expect(result.current.isSauceVisible).toBe(true);
  });
});
