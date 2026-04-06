// frontend/__tests__/hooks/useWeatherSmartCollection.test.ts

jest.mock('../../lib/api', () => ({
  recipeApi: {
    getWeatherSmartCollection: jest.fn(),
  },
}));

jest.mock('../../utils/locationService', () => ({
  locationService: {
    getCurrentLocation: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { useWeatherSmartCollection } from '../../hooks/useWeatherSmartCollection';
import { recipeApi } from '../../lib/api';
import { locationService } from '../../utils/locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGetWeather = recipeApi.getWeatherSmartCollection as jest.Mock;
const mockGetLocation = locationService.getCurrentLocation as jest.Mock;
const mockStorageGet = AsyncStorage.getItem as jest.Mock;

const mockCollection = {
  id: 'weather_today',
  name: 'Perfect for Today',
  icon: '❄️',
  description: 'Matched to your current weather',
  count: 8,
  weather: { condition: 'cold', description: 'clear sky', tempCelsius: 5 },
};

describe('useWeatherSmartCollection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageGet.mockResolvedValue(null);
  });

  it('returns null collection while loading', () => {
    mockGetLocation.mockResolvedValue({ latitude: 40.7, longitude: -74.0 });
    mockGetWeather.mockResolvedValue({ data: { collection: mockCollection } });

    const { result } = renderHook(() => useWeatherSmartCollection());
    expect(result.current.collection).toBeNull();
  });

  it('returns collection after location + API resolve', async () => {
    mockGetLocation.mockResolvedValue({ latitude: 40.7, longitude: -74.0 });
    mockGetWeather.mockResolvedValue({ data: { collection: mockCollection } });

    const { result } = renderHook(() => useWeatherSmartCollection());
    await waitFor(() => expect(result.current.collection).not.toBeNull());

    expect(result.current.collection?.id).toBe('weather_today');
    expect(result.current.collection?.count).toBe(8);
    // Icon should be overridden by condition
    expect(result.current.collection?.icon).toBe('❄️');
  });

  it('overrides icon to ☀️ for hot condition', async () => {
    const hotCollection = { ...mockCollection, weather: { condition: 'hot', description: 'sunny', tempCelsius: 32 } };
    mockGetLocation.mockResolvedValue({ latitude: 25.0, longitude: -80.0 });
    mockGetWeather.mockResolvedValue({ data: { collection: hotCollection } });

    const { result } = renderHook(() => useWeatherSmartCollection());
    await waitFor(() => expect(result.current.collection?.icon).toBe('☀️'));
  });

  it('returns null when location is unavailable', async () => {
    mockGetLocation.mockResolvedValue(null);

    const { result } = renderHook(() => useWeatherSmartCollection());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.collection).toBeNull();
  });

  it('returns null when API throws', async () => {
    mockGetLocation.mockResolvedValue({ latitude: 40.7, longitude: -74.0 });
    mockGetWeather.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWeatherSmartCollection());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.collection).toBeNull();
  });

  it('reads from cache and skips API call when cache is fresh', async () => {
    const cacheEntry = {
      data: mockCollection,
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    mockStorageGet.mockResolvedValue(JSON.stringify(cacheEntry));

    const { result } = renderHook(() => useWeatherSmartCollection());
    await waitFor(() => expect(result.current.collection).not.toBeNull());

    expect(mockGetWeather).not.toHaveBeenCalled();
    expect(result.current.collection?.count).toBe(8);
  });

  it('ignores expired cache and re-fetches', async () => {
    const expiredCache = {
      data: mockCollection,
      expiresAt: Date.now() - 1000, // expired
    };
    mockStorageGet.mockResolvedValue(JSON.stringify(expiredCache));
    mockGetLocation.mockResolvedValue({ latitude: 40.7, longitude: -74.0 });
    mockGetWeather.mockResolvedValue({ data: { collection: mockCollection } });

    const { result } = renderHook(() => useWeatherSmartCollection());
    await waitFor(() => expect(result.current.collection).not.toBeNull());

    expect(mockGetWeather).toHaveBeenCalledTimes(1);
  });
});
