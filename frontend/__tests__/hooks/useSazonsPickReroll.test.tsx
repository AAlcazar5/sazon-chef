// P2 retention — Sazon's Pick re-roll counter.

const mockGet = jest.fn();
const mockSet = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGet(...args),
    setItem: (...args: unknown[]) => mockSet(...args),
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import {
  useSazonsPickReroll,
  SAZONS_PICK_MAX_ROLLS,
} from '../../hooks/useSazonsPickReroll';

const today = (() => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
})();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSazonsPickReroll', () => {
  it('starts at MAX rolls when storage is empty', async () => {
    mockGet.mockResolvedValue(null);
    const { result } = renderHook(() => useSazonsPickReroll());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(result.current.hydrated).toBe(true);
    expect(result.current.rollsRemaining).toBe(SAZONS_PICK_MAX_ROLLS);
  });

  it('resets the counter when the stored date is from a previous day', async () => {
    mockGet.mockResolvedValue(JSON.stringify({ date: '1999-12-31', used: 3 }));
    const { result } = renderHook(() => useSazonsPickReroll());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(result.current.rollsRemaining).toBe(SAZONS_PICK_MAX_ROLLS);
  });

  it('preserves the counter for the same local day', async () => {
    mockGet.mockResolvedValue(JSON.stringify({ date: today, used: 2 }));
    const { result } = renderHook(() => useSazonsPickReroll());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(result.current.rollsRemaining).toBe(SAZONS_PICK_MAX_ROLLS - 2);
  });

  it('consumeRoll decrements + persists, returning true while rolls remain', async () => {
    mockGet.mockResolvedValue(null);
    const { result } = renderHook(() => useSazonsPickReroll());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    // Set up storage to return what we wrote on subsequent reads:
    mockGet.mockResolvedValue(JSON.stringify({ date: today, used: 0 }));

    let returned: boolean | null = null;
    await act(async () => {
      returned = await result.current.consumeRoll();
    });
    expect(returned).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      '@sazon/sazons_pick/rerolls',
      JSON.stringify({ date: today, used: 1 }),
    );
    expect(result.current.rollsRemaining).toBe(SAZONS_PICK_MAX_ROLLS - 1);
  });

  it('returns false once today\'s allowance is exhausted', async () => {
    mockGet.mockResolvedValue(JSON.stringify({ date: today, used: SAZONS_PICK_MAX_ROLLS }));
    const { result } = renderHook(() => useSazonsPickReroll());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    let returned: boolean | null = null;
    await act(async () => {
      returned = await result.current.consumeRoll();
    });
    expect(returned).toBe(false);
    expect(mockSet).not.toHaveBeenCalled();
    expect(result.current.rollsRemaining).toBe(0);
  });
});
