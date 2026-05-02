// frontend/__tests__/hooks/usePlateOfTheWeek.test.ts
// Group 10X Phase 8 — plate-of-the-week hook unit tests.

jest.mock('../../lib/api', () => ({
  composedPlateApi: {
    fetchOfTheWeek: jest.fn(),
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { composedPlateApi } from '../../lib/api';
import { usePlateOfTheWeek } from '../../hooks/usePlateOfTheWeek';

const mockFetch = composedPlateApi.fetchOfTheWeek as jest.Mock;

const MOCK_PLATE = {
  id: 'plate-of-week-id',
  title: 'Mediterranean Bowl',
  imageUrl: 'https://example.com/plate.jpg',
  totalCalories: 540,
  totalProtein: 38,
  totalCarbs: 52,
  totalFat: 18,
  region: 'Mediterranean',
  saveCount: 142,
};

describe('usePlateOfTheWeek', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls composedPlateApi.fetchOfTheWeek once on mount', async () => {
    mockFetch.mockResolvedValue({ data: { plate: MOCK_PLATE } });
    renderHook(() => usePlateOfTheWeek());
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  });

  it('returns plate from API response', async () => {
    mockFetch.mockResolvedValue({ data: { plate: MOCK_PLATE } });
    const { result } = renderHook(() => usePlateOfTheWeek());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plate).toEqual(MOCK_PLATE);
  });

  it('returns null plate when API returns null', async () => {
    mockFetch.mockResolvedValue({ data: { plate: null } });
    const { result } = renderHook(() => usePlateOfTheWeek());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plate).toBeNull();
  });

  it('returns null plate when API responds 404', async () => {
    const error: any = new Error('Not found');
    error.response = { status: 404 };
    mockFetch.mockRejectedValue(error);
    const { result } = renderHook(() => usePlateOfTheWeek());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plate).toBeNull();
  });

  it('returns null plate when API throws generic error', async () => {
    mockFetch.mockRejectedValue(new Error('Network down'));
    const { result } = renderHook(() => usePlateOfTheWeek());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plate).toBeNull();
  });

  it('starts with isLoading=true then resolves to false', async () => {
    let resolve!: (v: any) => void;
    mockFetch.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => usePlateOfTheWeek());
    expect(result.current.isLoading).toBe(true);
    resolve({ data: { plate: MOCK_PLATE } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
