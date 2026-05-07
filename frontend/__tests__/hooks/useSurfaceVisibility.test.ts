// frontend/__tests__/hooks/useSurfaceVisibility.test.ts
// ROADMAP 4.0 N2.2 — first-7-days surface coordination hook test.

const mockCoverage = jest.fn();
jest.mock('../../lib/api', () => ({
  todayApi: { coverage: (...args: unknown[]) => mockCoverage(...args) },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import {
  useSurfaceVisibility,
  __helpers,
} from '../../hooks/useSurfaceVisibility';

beforeEach(() => {
  mockCoverage.mockReset();
});

describe('N2.2 — buildVisibility (pure)', () => {
  it('cold tier: only cold-tier surfaces are visible', () => {
    const v = __helpers.buildVisibility('cold');
    expect(v.today_hero).toBe(true);
    expect(v.first_of_day_note).toBe(true);
    expect(v.activation_card).toBe(true);
    // mid-tier surfaces hidden
    expect(v.use_it_up_strip).toBe(false);
    expect(v.try_this_ingredient).toBe(false);
    expect(v.sunday_polaroid).toBe(false);
  });

  it('mid tier: cold + mid surfaces are visible', () => {
    const v = __helpers.buildVisibility('mid');
    expect(v.today_hero).toBe(true);
    expect(v.use_it_up_strip).toBe(true);
    expect(v.try_this_ingredient).toBe(true);
    expect(v.sunday_polaroid).toBe(true);
    expect(v.pantry_iq_card).toBe(true);
  });

  it('high tier: all non-retired surfaces are visible', () => {
    const v = __helpers.buildVisibility('high');
    for (const k of Object.keys(v)) {
      expect(v[k]).toBe(true);
    }
  });
});

describe('N2.2 — useSurfaceVisibility hook', () => {
  it('returns loading=true initially, then resolves to fetched tier', async () => {
    mockCoverage.mockResolvedValue({ data: { tier: 'mid' } });
    const { result } = renderHook(() => useSurfaceVisibility());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe('mid');
    expect(result.current.visibility.today_hero).toBe(true);
    expect(result.current.visibility.use_it_up_strip).toBe(true);
  });

  it('falls back to cold tier on API error (graceful)', async () => {
    mockCoverage.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSurfaceVisibility());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe('cold');
    expect(result.current.visibility.today_hero).toBe(true);
    expect(result.current.visibility.use_it_up_strip).toBe(false);
  });

  it('cold tier visibleSurfaceIds("today") matches the cold cohort', async () => {
    mockCoverage.mockResolvedValue({ data: { tier: 'cold' } });
    const { result } = renderHook(() => useSurfaceVisibility());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const todaySurfaces = result.current.visibleSurfaceIds('today');
    expect(todaySurfaces).toContain('today_hero');
    expect(todaySurfaces).toContain('first_of_day_note');
    expect(todaySurfaces).toContain('activation_card');
    expect(todaySurfaces).not.toContain('sunday_polaroid');
    expect(todaySurfaces).not.toContain('use_it_up_strip');
  });

  it('mid tier unlocks the IG/use-it-up triad', async () => {
    mockCoverage.mockResolvedValue({ data: { tier: 'mid' } });
    const { result } = renderHook(() => useSurfaceVisibility());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const todaySurfaces = result.current.visibleSurfaceIds('today');
    expect(todaySurfaces).toContain('use_it_up_strip');
    expect(todaySurfaces).toContain('try_this_ingredient');
    expect(todaySurfaces).toContain('sunday_polaroid');
  });

  it('Sazon tab: chat is always visible regardless of tier', async () => {
    for (const tier of ['cold', 'mid', 'high'] as const) {
      mockCoverage.mockResolvedValue({ data: { tier } });
      const { result } = renderHook(() => useSurfaceVisibility());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.visibleSurfaceIds('sazon')).toContain('sazon_chat');
    }
  });

  it('unknown tier from API → cold fallback', async () => {
    mockCoverage.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useSurfaceVisibility());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe('cold');
  });
});
