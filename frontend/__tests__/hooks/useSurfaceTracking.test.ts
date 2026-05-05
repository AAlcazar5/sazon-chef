// frontend/__tests__/hooks/useSurfaceTracking.test.ts
// ROADMAP 4.0 Tier B3 — useSurfaceTracking hook (TDD).

const mockRecord = jest.fn();
const mockRecordBatch = jest.fn();

jest.mock('../../lib/api', () => ({
  surfaceEventApi: {
    record: (...args: unknown[]) => mockRecord(...args),
    recordBatch: (...args: unknown[]) => mockRecordBatch(...args),
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useSurfaceTracking } from '../../hooks/useSurfaceTracking';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useSurfaceTracking', () => {
  it('exposes track + flush methods', () => {
    const { result } = renderHook(() => useSurfaceTracking());
    expect(typeof result.current.track).toBe('function');
    expect(typeof result.current.flush).toBe('function');
  });

  it('does NOT call the API immediately on track (debounced batch)', () => {
    const { result } = renderHook(() => useSurfaceTracking());
    act(() => {
      result.current.track({ surface: 'today_hero', action: 'impression', recipeId: 'r1' });
    });
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockRecordBatch).not.toHaveBeenCalled();
  });

  it('flushes batch after the debounce window', () => {
    const { result } = renderHook(() => useSurfaceTracking());
    act(() => {
      result.current.track({ surface: 'today_hero', action: 'impression', recipeId: 'r1' });
      result.current.track({ surface: 'today_hero', action: 'tap', recipeId: 'r1' });
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockRecordBatch).toHaveBeenCalledTimes(1);
    const events = mockRecordBatch.mock.calls[0][0];
    expect(events).toHaveLength(2);
  });

  it('explicit flush() sends pending events immediately', () => {
    const { result } = renderHook(() => useSurfaceTracking());
    act(() => {
      result.current.track({ surface: 'kitchen_discover', action: 'impression', recipeId: 'r1' });
      result.current.flush();
    });
    expect(mockRecordBatch).toHaveBeenCalledTimes(1);
  });

  it('flush() is a no-op when there are no pending events', () => {
    const { result } = renderHook(() => useSurfaceTracking());
    act(() => {
      result.current.flush();
    });
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockRecordBatch).not.toHaveBeenCalled();
  });

  it('coalesces duplicate impression events for the same (surface, recipeId)', () => {
    const { result } = renderHook(() => useSurfaceTracking());
    act(() => {
      result.current.track({ surface: 'today_hero', action: 'impression', recipeId: 'r1' });
      result.current.track({ surface: 'today_hero', action: 'impression', recipeId: 'r1' });
      result.current.track({ surface: 'today_hero', action: 'impression', recipeId: 'r1' });
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockRecordBatch).toHaveBeenCalledTimes(1);
    expect(mockRecordBatch.mock.calls[0][0]).toHaveLength(1);
  });

  it('does NOT coalesce different actions or different recipeIds', () => {
    const { result } = renderHook(() => useSurfaceTracking());
    act(() => {
      result.current.track({ surface: 'today_hero', action: 'impression', recipeId: 'r1' });
      result.current.track({ surface: 'today_hero', action: 'tap', recipeId: 'r1' });
      result.current.track({ surface: 'today_hero', action: 'impression', recipeId: 'r2' });
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockRecordBatch.mock.calls[0][0]).toHaveLength(3);
  });
});
