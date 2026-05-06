// frontend/__tests__/hooks/useFilterChipRanking.test.ts
// ROADMAP 4.0 FX3.4 — chip ranking by user toggle frequency.

const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, val: string) => {
    mockStorage[key] = val;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  rankChips,
  useFilterChipRanking,
  type ChipToggleCounts,
} from '../../hooks/useFilterChipRanking';
import type { FilterChipDef } from '../../components/ui/FilterRow';

const baseChips: FilterChipDef[] = [
  { id: 'quick', label: 'Quick' },
  { id: 'easy', label: 'Easy' },
  { id: 'high_protein', label: 'High Protein' },
  { id: 'budget', label: 'Budget' },
];

describe('rankChips (FX3.4 pure)', () => {
  it('returns input order under the cold-start threshold', () => {
    const counts: ChipToggleCounts = { easy: 1, budget: 2 };
    const ranked = rankChips(baseChips, counts);
    expect(ranked.map((c) => c.id)).toEqual(['quick', 'easy', 'high_protein', 'budget']);
  });

  it('reorders by descending count once threshold is met', () => {
    const counts: ChipToggleCounts = { easy: 4, high_protein: 3 };
    // total = 7 >= 5 threshold
    const ranked = rankChips(baseChips, counts);
    expect(ranked.map((c) => c.id)).toEqual(['easy', 'high_protein', 'quick', 'budget']);
  });

  it('preserves input order for chips with equal counts', () => {
    const counts: ChipToggleCounts = { easy: 5, high_protein: 5 };
    const ranked = rankChips(baseChips, counts);
    // 'easy' precedes 'high_protein' in baseChips → preserved on tie.
    expect(ranked.map((c) => c.id)).toEqual(['easy', 'high_protein', 'quick', 'budget']);
  });

  it('places unseen chips after seen ones in their default order', () => {
    const counts: ChipToggleCounts = { high_protein: 6 };
    const ranked = rankChips(baseChips, counts);
    expect(ranked[0].id).toBe('high_protein');
    expect(ranked.slice(1).map((c) => c.id)).toEqual(['quick', 'easy', 'budget']);
  });
});

describe('useFilterChipRanking (FX3.4)', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it('starts loaded=false then true; cold-start returns input order', async () => {
    const { result } = renderHook(() => useFilterChipRanking(baseChips));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.rankedChips.map((c) => c.id)).toEqual(['quick', 'easy', 'high_protein', 'budget']);
  });

  it('recordChipToggle increments the count and persists', async () => {
    const { result } = renderHook(() => useFilterChipRanking(baseChips));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.recordChipToggle('easy');
    });
    expect(result.current.counts.easy).toBe(1);
    expect(mockStorage['filterChipToggleCounts:v1']).toBeTruthy();
    const persisted = JSON.parse(mockStorage['filterChipToggleCounts:v1']);
    expect(persisted.easy).toBe(1);
  });

  it('post-threshold ranking puts most-toggled first', async () => {
    mockStorage['filterChipToggleCounts:v1'] = JSON.stringify({
      high_protein: 6,
      easy: 2,
    });
    const { result } = renderHook(() => useFilterChipRanking(baseChips));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.rankedChips[0].id).toBe('high_protein');
  });
});
