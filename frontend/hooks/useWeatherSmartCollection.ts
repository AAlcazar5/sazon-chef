// hooks/useWeatherSmartCollection.ts
// Fetches the weather-aware smart collection using device location.
//
// P5 (persister): hand-rolled AsyncStorage cache replaced by React Query
// + the global persister. The persister hydrates from disk on cold start;
// `staleTime: 1h` preserves the original "cache for 1 hour" contract.
// Gracefully degrades when location permission is denied or weather API
// is unavailable.

import { useQuery } from '@tanstack/react-query';
import { locationService } from '../utils/locationService';
import { recipeApi } from '../lib/api';

export type WeatherCondition = 'hot' | 'cold' | 'rainy' | 'mild';

export interface WeatherCollectionData {
  id: string;
  name: string;
  icon: string;
  description: string;
  count: number;
  weather: {
    condition: WeatherCondition;
    description: string;
    tempCelsius: number;
  };
}

interface UseWeatherSmartCollectionResult {
  collection: WeatherCollectionData | null;
  loading: boolean;
}

const QUERY_KEY = ['weatherSmartCollection'] as const;
const STALE_TIME_MS = 60 * 60 * 1000; // 1 hour

function weatherIcon(condition: WeatherCondition): string {
  switch (condition) {
    case 'cold': return '❄️';
    case 'rainy': return '🌧️';
    case 'hot': return '☀️';
    case 'mild': return '🌤️';
  }
}

export function useWeatherSmartCollection(): UseWeatherSmartCollectionResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<WeatherCollectionData | null> => {
      const coords = await locationService.getCurrentLocation();
      if (!coords) return null;

      try {
        const res = await recipeApi.getWeatherSmartCollection(
          coords.latitude,
          coords.longitude,
        );
        const wrapper = res as unknown as {
          data?: { collection?: WeatherCollectionData };
          collection?: WeatherCollectionData;
        };
        const data: WeatherCollectionData | undefined =
          wrapper?.data?.collection ?? wrapper?.collection;
        if (!data) return null;
        return {
          ...data,
          icon: weatherIcon(data.weather?.condition ?? 'mild'),
        };
      } catch {
        return null;
      }
    },
    staleTime: STALE_TIME_MS,
  });

  return {
    collection: query.data ?? null,
    loading: query.isLoading,
  };
}
