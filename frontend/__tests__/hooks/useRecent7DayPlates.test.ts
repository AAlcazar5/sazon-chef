// frontend/__tests__/hooks/useRecent7DayPlates.test.ts

const mockWeeklySummary = jest.fn();
jest.mock('../../lib/api', () => ({
  composedPlateApi: {
    weeklySummary: (...args: unknown[]) => mockWeeklySummary(...args),
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { useRecent7DayPlates } from '../../hooks/useRecent7DayPlates';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useRecent7DayPlates', () => {
  it('returns counts from API on mount', async () => {
    mockWeeklySummary.mockResolvedValueOnce({
      data: { totalPlatesThisWeek: 4, greenVegCount: 1 },
    });
    const { result } = renderHook(() => useRecent7DayPlates());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalPlatesThisWeek).toBe(4);
    expect(result.current.greenVegCount).toBe(1);
  });

  it('returns zeros on API failure', async () => {
    mockWeeklySummary.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useRecent7DayPlates());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalPlatesThisWeek).toBe(0);
    expect(result.current.greenVegCount).toBe(0);
  });

  it('starts in loading state', () => {
    mockWeeklySummary.mockResolvedValueOnce({
      data: { totalPlatesThisWeek: 0, greenVegCount: 0 },
    });
    const { result } = renderHook(() => useRecent7DayPlates());
    expect(result.current.isLoading).toBe(true);
  });

  it('calls weeklySummary exactly once', async () => {
    mockWeeklySummary.mockResolvedValueOnce({ data: { totalPlatesThisWeek: 0, greenVegCount: 0 } });
    renderHook(() => useRecent7DayPlates());
    await waitFor(() => expect(mockWeeklySummary).toHaveBeenCalledTimes(1));
  });
});
