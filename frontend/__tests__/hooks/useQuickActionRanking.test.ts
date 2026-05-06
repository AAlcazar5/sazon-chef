// ROADMAP 4.0 HX4.1 — quick action chip ranking.

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
  rankQuickActions,
  useQuickActionRanking,
  type QuickActionTapLog,
} from '../../hooks/useQuickActionRanking';

interface Action { id: string; label: string }

const all: Action[] = [
  { id: 'voice', label: 'Voice' },
  { id: 'snap', label: 'Snap' },
  { id: 'build-a-plate', label: 'Build a plate' },
  { id: 'find-me-a-meal', label: 'Find me a meal' },
];
const idOf = (a: Action) => a.id;

const NOW = Date.parse('2026-05-06T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

describe('rankQuickActions (HX4.1 pure)', () => {
  it('returns input order under the cold-start threshold', () => {
    const log: QuickActionTapLog = {
      'voice': { count: 2, lastTappedAt: NOW - DAY },
      'snap':  { count: 2, lastTappedAt: NOW - DAY }, // total = 4 < 5
    };
    expect(rankQuickActions({ all, log, idOf, now: NOW }).map(idOf))
      .toEqual(['voice', 'snap', 'build-a-plate', 'find-me-a-meal']);
  });

  it('reorders by descending tap count once the threshold is met', () => {
    const log: QuickActionTapLog = {
      'find-me-a-meal': { count: 6, lastTappedAt: NOW - DAY },
      'voice':          { count: 1, lastTappedAt: NOW - DAY },
    };
    const ranked = rankQuickActions({ all, log, idOf, now: NOW });
    expect(ranked[0].id).toBe('find-me-a-meal');
    expect(ranked[1].id).toBe('voice');
  });

  it('hides chips with zero taps in the last 30 days, preserving > MIN_VISIBLE', () => {
    const log: QuickActionTapLog = {
      'voice':          { count: 4, lastTappedAt: NOW - DAY },
      'snap':           { count: 3, lastTappedAt: NOW - 45 * DAY }, // stale
      'build-a-plate':  { count: 2, lastTappedAt: NOW - DAY },
      'find-me-a-meal': { count: 1, lastTappedAt: NOW - DAY },
    };
    const ranked = rankQuickActions({ all, log, idOf, now: NOW });
    // 'snap' is filtered out (stale).
    expect(ranked.map(idOf)).not.toContain('snap');
    expect(ranked.length).toBe(3);
  });

  it('never returns fewer than MIN_VISIBLE — pads from default order', () => {
    // Three chips stale; only voice fresh → must pad back to ≥ 3.
    const log: QuickActionTapLog = {
      'voice':          { count: 6, lastTappedAt: NOW - DAY },
      'snap':           { count: 1, lastTappedAt: NOW - 60 * DAY },
      'build-a-plate':  { count: 1, lastTappedAt: NOW - 60 * DAY },
      'find-me-a-meal': { count: 1, lastTappedAt: NOW - 60 * DAY },
    };
    const ranked = rankQuickActions({ all, log, idOf, now: NOW });
    expect(ranked.length).toBeGreaterThanOrEqual(3);
    expect(ranked[0].id).toBe('voice');
  });

  it('preserves input order on tie', () => {
    const log: QuickActionTapLog = {
      'voice':          { count: 5, lastTappedAt: NOW - DAY },
      'find-me-a-meal': { count: 5, lastTappedAt: NOW - DAY }, // total = 10 ≥ 5
    };
    const ranked = rankQuickActions({ all, log, idOf, now: NOW });
    expect(ranked[0].id).toBe('voice'); // both 5; voice precedes in default order
    expect(ranked[1].id).toBe('find-me-a-meal');
  });
});

describe('useQuickActionRanking (HX4.1)', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it('cold-start hook → loaded=true → default order', async () => {
    const { result } = renderHook(() => useQuickActionRanking(all, idOf));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.rankedActions.map(idOf)).toEqual(['voice', 'snap', 'build-a-plate', 'find-me-a-meal']);
  });

  it('recordTap increments + persists', async () => {
    const { result } = renderHook(() => useQuickActionRanking(all, idOf));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.recordTap('voice');
    });
    expect(mockStorage['quickActionTapLog:v1']).toBeTruthy();
    const persisted = JSON.parse(mockStorage['quickActionTapLog:v1']);
    expect(persisted.voice.count).toBe(1);
  });
});
