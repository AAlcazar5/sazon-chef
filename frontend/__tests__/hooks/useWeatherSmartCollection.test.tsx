// frontend/__tests__/hooks/useWeatherSmartCollection.test.tsx
// P5 (persister): hand-rolled AsyncStorage cache replaced by React Query
// + the global persister. Cache-hydration tests now seed via
// queryClient.setQueryData instead of poking AsyncStorage directly.

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

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWeatherSmartCollection } from '../../hooks/useWeatherSmartCollection';
import { recipeApi } from '../../lib/api';
import { locationService } from '../../utils/locationService';

const mockGetWeather = recipeApi.getWeatherSmartCollection as jest.Mock;
const mockGetLocation = locationService.getCurrentLocation as jest.Mock;

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

function withClient(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const mockCollection = {
  id: 'weather_today',
  name: 'Perfect for Today',
  icon: '❄️',
  description: 'Matched to your current weather',
  count: 8,
  weather: { condition: 'cold', description: 'clear sky', tempCelsius: 5 },
};

describe('useWeatherSmartCollection (P5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null collection while loading', () => {
    mockGetLocation.mockResolvedValue({ latitude: 40.7, longitude: -74.0 });
    mockGetWeather.mockResolvedValue({ data: { collection: mockCollection } });

    const { result } = renderHook(() => useWeatherSmartCollection(), {
      wrapper: withClient(makeClient()),
    });
    expect(result.current.collection).toBeNull();
  });

  it('returns collection after location + API resolve', async () => {
    mockGetLocation.mockResolvedValue({ latitude: 40.7, longitude: -74.0 });
    mockGetWeather.mockResolvedValue({ data: { collection: mockCollection } });

    const { result } = renderHook(() => useWeatherSmartCollection(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.collection).not.toBeNull());

    expect(result.current.collection?.id).toBe('weather_today');
    expect(result.current.collection?.count).toBe(8);
    expect(result.current.collection?.icon).toBe('❄️');
  });

  it('overrides icon to ☀️ for hot condition', async () => {
    const hotCollection = {
      ...mockCollection,
      weather: { condition: 'hot', description: 'sunny', tempCelsius: 32 },
    };
    mockGetLocation.mockResolvedValue({ latitude: 25.0, longitude: -80.0 });
    mockGetWeather.mockResolvedValue({ data: { collection: hotCollection } });

    const { result } = renderHook(() => useWeatherSmartCollection(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.collection?.icon).toBe('☀️'));
  });

  it('returns null when location is unavailable', async () => {
    mockGetLocation.mockResolvedValue(null);

    const { result } = renderHook(() => useWeatherSmartCollection(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.collection).toBeNull();
  });

  it('returns null when API throws', async () => {
    mockGetLocation.mockResolvedValue({ latitude: 40.7, longitude: -74.0 });
    mockGetWeather.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWeatherSmartCollection(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.collection).toBeNull();
  });

  it('serves seeded cache (persister hydration) and skips the network', async () => {
    const client = makeClient();
    // Simulate persister hydration: pre-populate the cache for the query key
    // before the hook ever mounts. With staleTime > 0 and fresh data, useQuery
    // returns the cached value without firing queryFn.
    client.setQueryData(['weatherSmartCollection'], mockCollection);

    const { result } = renderHook(() => useWeatherSmartCollection(), {
      wrapper: withClient(client),
    });
    await waitFor(() => expect(result.current.collection).not.toBeNull());

    expect(mockGetWeather).not.toHaveBeenCalled();
    expect(mockGetLocation).not.toHaveBeenCalled();
    expect(result.current.collection?.count).toBe(8);
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockGetLocation.mockResolvedValue({ latitude: 40.7, longitude: -74.0 });
    mockGetWeather.mockResolvedValue({ data: { collection: mockCollection } });

    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useWeatherSmartCollection(), { wrapper });
    const b = renderHook(() => useWeatherSmartCollection(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });
    expect(mockGetWeather).toHaveBeenCalledTimes(1);
    expect(mockGetLocation).toHaveBeenCalledTimes(1);
  });
});
