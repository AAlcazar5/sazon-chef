// frontend/__tests__/hooks/useAffinityExamples.test.ts
// Group 11 Phase 5 — N=1 empty-state polish hook tests.

const mockGetBrowseByFamily = jest.fn();
jest.mock('../../lib/api', () => ({
  recipeApi: {
    getBrowseByFamily: (...args: any[]) => mockGetBrowseByFamily(...args),
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAffinityExamples, formatAffinityHint } from '../../hooks/useAffinityExamples';

describe('formatAffinityHint', () => {
  it('returns empty string when there is no signal', () => {
    expect(formatAffinityHint({ topCuisines: [], wildcard: null, loading: false })).toBe('');
  });

  it('formats one cuisine as "Start with X."', () => {
    expect(
      formatAffinityHint({ topCuisines: ['Thai'], wildcard: null, loading: false }),
    ).toBe('Start with Thai.');
  });

  it('formats two cuisines as "Try X or Y."', () => {
    expect(
      formatAffinityHint({ topCuisines: ['Thai', 'Mexican'], wildcard: null, loading: false }),
    ).toBe('Try Thai or Mexican.');
  });

  it('combines top 2 with the wildcard for "Try X, Y, or Z."', () => {
    expect(
      formatAffinityHint({
        topCuisines: ['Thai', 'Mexican'],
        wildcard: 'Burmese',
        loading: false,
      }),
    ).toBe('Try Thai, Mexican, or Burmese.');
  });
});

describe('useAffinityExamples', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty examples when no families are returned', async () => {
    mockGetBrowseByFamily.mockResolvedValueOnce({ data: { families: [] } });
    const { result } = renderHook(() => useAffinityExamples());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.topCuisines).toEqual([]);
    expect(result.current.wildcard).toBeNull();
  });

  it('pulls top cuisines from the highest-affinity family in order', async () => {
    mockGetBrowseByFamily.mockResolvedValueOnce({
      data: {
        families: [
          {
            family: 'Latin American',
            cuisines: ['Mexican', 'Salvadorean'],
            affinityScore: 6,
            exploredCuisines: ['Mexican', 'Salvadorean'],
            isExplored: true,
            hasNewForYou: false,
          },
          {
            family: 'East & Southeast Asian',
            cuisines: ['Thai'],
            affinityScore: 2,
            exploredCuisines: ['Thai'],
            isExplored: true,
            hasNewForYou: true,
          },
          {
            family: 'European — Western',
            cuisines: ['French'],
            affinityScore: 0,
            exploredCuisines: [],
            isExplored: false,
            hasNewForYou: false,
          },
        ],
      },
    });

    const { result } = renderHook(() => useAffinityExamples());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.topCuisines).toEqual(['Mexican', 'Salvadorean', 'Thai']);
  });

  it('picks a wildcard from the first hasNewForYou family, preferring unexplored cuisines', async () => {
    mockGetBrowseByFamily.mockResolvedValueOnce({
      data: {
        families: [
          {
            family: 'Latin American',
            cuisines: ['Mexican', 'Salvadorean'],
            affinityScore: 4,
            exploredCuisines: ['Mexican'],
            isExplored: true,
            hasNewForYou: false,
          },
          {
            family: 'East & Southeast Asian',
            cuisines: ['Thai', 'Burmese', 'Vietnamese'],
            affinityScore: 0,
            exploredCuisines: [],
            isExplored: false,
            hasNewForYou: true,
          },
        ],
      },
    });

    const { result } = renderHook(() => useAffinityExamples());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Wildcard should be the first unexplored cuisine in the SE Asian family
    expect(result.current.wildcard).toBe('Thai');
  });

  it('does not pick a wildcard already in topCuisines', async () => {
    mockGetBrowseByFamily.mockResolvedValueOnce({
      data: {
        families: [
          {
            family: 'East & Southeast Asian',
            cuisines: ['Thai', 'Vietnamese'],
            affinityScore: 4,
            exploredCuisines: ['Thai'],
            isExplored: true,
            hasNewForYou: true,
          },
        ],
      },
    });

    const { result } = renderHook(() => useAffinityExamples());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.topCuisines).toEqual(['Thai']);
    // Wildcard must skip Thai (already in topCuisines) and Vietnamese is the
    // only other cuisine in the family — wildcard should land on Vietnamese.
    expect(result.current.wildcard).toBe('Vietnamese');
  });

  it('handles API rejection gracefully', async () => {
    mockGetBrowseByFamily.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useAffinityExamples());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.topCuisines).toEqual([]);
    expect(result.current.wildcard).toBeNull();
  });
});
