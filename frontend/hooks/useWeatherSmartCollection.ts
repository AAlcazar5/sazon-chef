// hooks/useWeatherSmartCollection.ts
// Fetches the weather-aware smart collection using device location.
// Caches result for 1 hour in AsyncStorage. Gracefully degrades when
// location permission is denied or weather API is unavailable.

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const CACHE_KEY = '@sazon_weather_collection';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function weatherIcon(condition: WeatherCondition): string {
  switch (condition) {
    case 'cold': return '❄️';
    case 'rainy': return '🌧️';
    case 'hot': return '☀️';
    case 'mild': return '🌤️';
  }
}

export function useWeatherSmartCollection(): UseWeatherSmartCollectionResult {
  const [collection, setCollection] = useState<WeatherCollectionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Check cache first
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, expiresAt } = JSON.parse(cached);
          if (Date.now() < expiresAt) {
            if (!cancelled) setCollection(data);
            return;
          }
        }
      } catch {
        // ignore cache read errors
      }

      setLoading(true);

      try {
        const coords = await locationService.getCurrentLocation();
        if (!coords || cancelled) return;

        const res = await recipeApi.getWeatherSmartCollection(coords.latitude, coords.longitude);
        const data: WeatherCollectionData = res?.data?.collection ?? res?.collection;
        if (!data || cancelled) return;

        // Override icon with condition-specific emoji
        const enriched: WeatherCollectionData = {
          ...data,
          icon: weatherIcon(data.weather?.condition ?? 'mild'),
        };

        setCollection(enriched);

        // Cache result
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          data: enriched,
          expiresAt: Date.now() + CACHE_TTL_MS,
        }));
      } catch {
        // Non-critical — silently degrade
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { collection, loading };
}
