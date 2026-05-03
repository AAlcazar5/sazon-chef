// Phase 6 (10Y-C): One-time fetch of memory count for the coach screen pill.
// Pro-only; free users return 0 without fetching. API errors are swallowed.

import { renderHook, waitFor } from '@testing-library/react-native';

const mockListMemories = jest.fn();

jest.mock('../../lib/api', () => ({
  coachApi: {
    listMemories: () => mockListMemories(),
  },
}));

const mockUseSubscription = jest.fn();

jest.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

import { useCoachMemoryCount } from '../../hooks/useCoachMemoryCount';

describe('useCoachMemoryCount', () => {
  beforeEach(() => {
    mockListMemories.mockReset();
    mockUseSubscription.mockReset();
  });

  it('returns 0 for free users without fetching', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'free', isPremium: false },
    });
    const { result } = renderHook(() => useCoachMemoryCount());
    expect(result.current).toBe(0);
    expect(mockListMemories).not.toHaveBeenCalled();
  });

  it('fetches and returns count for Pro users', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'premium', isPremium: true },
    });
    mockListMemories.mockResolvedValue([
      { id: 'a', kind: 'preference', content: 'x', confidence: 0.8 },
      { id: 'b', kind: 'goal', content: 'y', confidence: 0.6 },
    ]);
    const { result } = renderHook(() => useCoachMemoryCount());
    await waitFor(() => expect(result.current).toBe(2));
    expect(mockListMemories).toHaveBeenCalledTimes(1);
  });

  it('returns 0 silently on API error', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'premium', isPremium: true },
    });
    mockListMemories.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCoachMemoryCount());
    await waitFor(() => expect(mockListMemories).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });
});
