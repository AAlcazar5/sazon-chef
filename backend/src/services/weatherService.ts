// backend/src/services/weatherService.ts
// Thin OpenWeatherMap wrapper. Fetches current weather for a lat/lon pair.
// Cached per rounded coordinate per hour to avoid hammering the API.
// Gracefully returns null when OPENWEATHER_API_KEY is not configured.

import axios from 'axios';
import { cacheService } from '@/utils/cacheService';

const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5/weather';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export type WeatherCondition = 'hot' | 'cold' | 'rainy' | 'mild';

export interface WeatherContext {
  condition: WeatherCondition;
  tempCelsius: number;
  description: string;
}

/** Round coordinate to 1 decimal place so nearby users share cache entries */
function roundCoord(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function getWeatherContext(
  lat: number,
  lon: number,
): Promise<WeatherContext | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  const cacheKey = `weather:${roundCoord(lat)},${roundCoord(lon)}`;
  const cached = cacheService.get<WeatherContext>(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await axios.get(OPENWEATHER_BASE, {
      params: { lat, lon, appid: apiKey, units: 'metric' },
      timeout: 3000,
    });

    const tempCelsius: number = data.main?.temp ?? 20;
    const weatherId: number = data.weather?.[0]?.id ?? 800;
    const description: string = data.weather?.[0]?.description ?? 'clear';

    // Map to simplified conditions
    let condition: WeatherCondition;
    if (tempCelsius >= 28) {
      condition = 'hot';
    } else if (tempCelsius <= 10) {
      condition = 'cold';
    } else if (weatherId >= 200 && weatherId < 700) {
      // 2xx Thunder, 3xx Drizzle, 5xx Rain, 6xx Snow
      condition = 'rainy';
    } else {
      condition = 'mild';
    }

    const result: WeatherContext = { condition, tempCelsius, description };
    cacheService.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  } catch (err) {
    console.warn('⛅ Weather fetch failed (non-critical):', (err as any)?.message);
    return null;
  }
}
