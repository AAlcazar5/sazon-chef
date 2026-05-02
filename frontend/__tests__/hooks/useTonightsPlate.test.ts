// frontend/__tests__/hooks/useTonightsPlate.test.ts
// Group 10X Phase 2 — hook that fetches & caches the plate-from-pantry result.

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/api', () => ({
  mealComponentApi: {
    plateFromPantry: jest.fn(),
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mealComponentApi } from '../../lib/api';
import { useTonightsPlate } from '../../hooks/useTonightsPlate';

const MOCK_PLATE = {
  id: 'plate-1',
  components: [],
  coherenceScore: 0.9,
  pantryCoveragePercent: 100,
  macroFitScore: 0.85,
};

const mockPlateFromPantry = mealComponentApi.plateFromPantry as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('useTonightsPlate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetItem.mockResolvedValue(null);
    mockPlateFromPantry.mockResolvedValue({ data: { plate: MOCK_PLATE } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls plateFromPantry on mount', async () => {
    renderHook(() => useTonightsPlate());
    await waitFor(() => {
      expect(mockPlateFromPantry).toHaveBeenCalledTimes(1);
    });
  });

  it('returns plate after successful fetch', async () => {
    const { result } = renderHook(() => useTonightsPlate());
    await waitFor(() => {
      expect(result.current.plate).toEqual(MOCK_PLATE);
    });
  });

  it('returns null plate when API returns null', async () => {
    mockPlateFromPantry.mockResolvedValue({ data: { plate: null } });
    const { result } = renderHook(() => useTonightsPlate());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.plate).toBeNull();
  });

  it('writes result to AsyncStorage cache after fetch', async () => {
    renderHook(() => useTonightsPlate());
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        'tonights_plate_cache',
        expect.stringContaining('"plate"'),
      );
    });
  });

  it('hydrates from fresh AsyncStorage cache and skips API call', async () => {
    const freshCache = JSON.stringify({ ts: Date.now(), plate: MOCK_PLATE });
    mockGetItem.mockImplementation((key: string) =>
      key === 'tonights_plate_cache' ? Promise.resolve(freshCache) : Promise.resolve(null),
    );

    const { result } = renderHook(() => useTonightsPlate());
    await waitFor(() => {
      expect(result.current.plate).toEqual(MOCK_PLATE);
    });
    expect(mockPlateFromPantry).not.toHaveBeenCalled();
  });

  it('re-fetches when cache is stale (>30 min old)', async () => {
    const staleTs = Date.now() - 31 * 60 * 1000;
    const staleCache = JSON.stringify({ ts: staleTs, plate: MOCK_PLATE });
    mockGetItem.mockImplementation((key: string) =>
      key === 'tonights_plate_cache' ? Promise.resolve(staleCache) : Promise.resolve(null),
    );

    renderHook(() => useTonightsPlate());
    await waitFor(() => {
      expect(mockPlateFromPantry).toHaveBeenCalledTimes(1);
    });
  });

  it('refetch bypasses cache and re-hits API', async () => {
    const freshCache = JSON.stringify({ ts: Date.now(), plate: MOCK_PLATE });
    mockGetItem.mockImplementation((key: string) =>
      key === 'tonights_plate_cache' ? Promise.resolve(freshCache) : Promise.resolve(null),
    );

    const { result } = renderHook(() => useTonightsPlate());
    await waitFor(() => expect(result.current.plate).toEqual(MOCK_PLATE));

    // With fresh cache, API should not have been called yet
    expect(mockPlateFromPantry).not.toHaveBeenCalled();

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(mockPlateFromPantry).toHaveBeenCalledTimes(1);
    });
  });

  it('returns error=false on successful fetch', async () => {
    const { result } = renderHook(() => useTonightsPlate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(false);
  });

  it('returns error=true when API throws', async () => {
    mockPlateFromPantry.mockRejectedValue(new Error('Network fail'));
    const { result } = renderHook(() => useTonightsPlate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.plate).toBeNull();
  });
});
