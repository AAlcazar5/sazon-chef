// W-D P2/D-3 — MemoryMirrorLead. Today leads with what the kitchen KNOWS
// (derived from the Cook Log), count-free (W-D1), and renders NOTHING when
// there's no history (no fabricated memory). useCookLog mocked.

jest.mock('../../../hooks/useCookLog', () => ({ useCookLog: jest.fn() }));
// Theme comes from the app's ThemeContext (the single source — it wraps
// NativeWind internally). Mirrors the cooking-component tests; using the
// real source here is what would have caught the nativewind-undefined
// runtime crash.
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', colors: { text: { primary: '#111' } } }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import MemoryMirrorLead from '../../../components/today/MemoryMirrorLead';
import { useCookLog } from '../../../hooks/useCookLog';

const mockHook = useCookLog as jest.Mock;
const base = { entries: [], loading: false, error: null, hasMore: false, loadMore: jest.fn(), refresh: jest.fn() };
const e = (type: string) => ({ id: type, type, recipeId: null, payload: {}, createdAt: '2026-05-18T10:00:00Z' });

beforeEach(() => mockHook.mockReset());

describe('MemoryMirrorLead', () => {
  it('mirrors a batch-cook fact from scale events (count-free)', () => {
    mockHook.mockReturnValue({ ...base, entries: [e('scale'), e('made_it')] });
    const { getByText, queryByText } = render(<MemoryMirrorLead />);
    expect(getByText('YOUR KITCHEN KNOWS')).toBeTruthy();
    expect(getByText(/You batch-cook/)).toBeTruthy();
    expect(queryByText(/\d/)).toBeNull(); // never a count/number
  });

  it('falls back to a "getting to know" fact for plain made_it history', () => {
    mockHook.mockReturnValue({ ...base, entries: [e('made_it')] });
    expect(render(<MemoryMirrorLead />).getByText(/getting to know how you cook/)).toBeTruthy();
  });

  it('renders NOTHING when there is no cook history (no fabricated memory)', () => {
    mockHook.mockReturnValue({ ...base, entries: [] });
    expect(render(<MemoryMirrorLead />).queryByText('YOUR KITCHEN KNOWS')).toBeNull();
  });

  it('renders nothing while loading', () => {
    mockHook.mockReturnValue({ ...base, loading: true });
    expect(render(<MemoryMirrorLead />).queryByText('YOUR KITCHEN KNOWS')).toBeNull();
  });

  it('renders nothing when no recognized signal (e.g. only notes)', () => {
    mockHook.mockReturnValue({ ...base, entries: [e('note')] });
    expect(render(<MemoryMirrorLead />).queryByText('YOUR KITCHEN KNOWS')).toBeNull();
  });

  it('FAILS CLOSED: an inner hook/render error renders null, never propagates', () => {
    // The exact production failure mode: useCookLog throwing during render.
    mockHook.mockImplementation(() => {
      throw new Error('cook log boom');
    });
    let result: ReturnType<typeof render>;
    expect(() => {
      result = render(<MemoryMirrorLead />);
    }).not.toThrow(); // boundary swallows it — never crashes the screen
    expect(result!.queryByText('YOUR KITCHEN KNOWS')).toBeNull();
  });

  it('FAILS CLOSED: entries undefined does not throw', () => {
    mockHook.mockReturnValue({ ...base, entries: undefined });
    expect(() => render(<MemoryMirrorLead />)).not.toThrow();
  });
});
