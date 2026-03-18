// backend/tests/services/weatherService.test.ts
import axios from 'axios';
import { getWeatherContext } from '../../src/services/weatherService';
import { cacheService } from '../../src/utils/cacheService';
import { weatherBoost } from '../../src/utils/temporalScoring';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('weatherService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPENWEATHER_API_KEY: 'test-key' };
    cacheService.clear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when API key is not configured', async () => {
    delete process.env.OPENWEATHER_API_KEY;
    const result = await getWeatherContext(40.7, -74.0);
    expect(result).toBeNull();
  });

  it('returns "hot" condition when temp >= 28°C', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        main: { temp: 32 },
        weather: [{ id: 800, description: 'clear sky' }],
      },
    });
    const result = await getWeatherContext(40.7, -74.0);
    expect(result).toEqual({
      condition: 'hot',
      tempCelsius: 32,
      description: 'clear sky',
    });
  });

  it('returns "cold" condition when temp <= 10°C', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        main: { temp: 5 },
        weather: [{ id: 800, description: 'clear sky' }],
      },
    });
    const result = await getWeatherContext(40.7, -74.0);
    expect(result?.condition).toBe('cold');
  });

  it('returns "rainy" condition for weather IDs 200-699', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        main: { temp: 18 },
        weather: [{ id: 500, description: 'light rain' }],
      },
    });
    const result = await getWeatherContext(40.7, -74.0);
    expect(result?.condition).toBe('rainy');
  });

  it('returns "mild" for moderate temp with clear skies', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        main: { temp: 20 },
        weather: [{ id: 800, description: 'clear sky' }],
      },
    });
    const result = await getWeatherContext(40.7, -74.0);
    expect(result?.condition).toBe('mild');
  });

  it('returns cached result on repeated calls', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        main: { temp: 20 },
        weather: [{ id: 800, description: 'clear' }],
      },
    });
    await getWeatherContext(40.7, -74.0);
    await getWeatherContext(40.7, -74.0);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('returns null on network error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));
    const result = await getWeatherContext(40.7, -74.0);
    expect(result).toBeNull();
  });
});

describe('weatherBoost', () => {
  it('boosts salad recipes on hot days', () => {
    const recipe = { title: 'Summer Salad', calories: 300, cookTime: 10 };
    expect(weatherBoost(recipe, 'hot')).toBe(15);
  });

  it('boosts light recipes on hot days even without tag match', () => {
    const recipe = { title: 'Quick Bites', calories: 350, cookTime: 15 };
    expect(weatherBoost(recipe, 'hot')).toBe(8);
  });

  it('penalises heavy recipes on hot days', () => {
    const recipe = { title: 'Slow Braised Beef', calories: 800, cookTime: 120 };
    expect(weatherBoost(recipe, 'hot')).toBe(-10);
  });

  it('boosts soup recipes on cold days', () => {
    const recipe = { title: 'Chicken Soup', calories: 400, cookTime: 45 };
    expect(weatherBoost(recipe, 'cold')).toBe(15);
  });

  it('boosts hearty recipes on cold days', () => {
    const recipe = { title: 'Big Dinner', calories: 600, cookTime: 50 };
    expect(weatherBoost(recipe, 'cold')).toBe(8);
  });

  it('boosts comfort food on rainy days', () => {
    const recipe = { title: 'Mac and Cheese', calories: 600 };
    expect(weatherBoost(recipe, 'rainy')).toBe(12);
  });

  it('gives small boost to high-calorie recipes on rainy days', () => {
    const recipe = { title: 'Pasta Bake', calories: 550, cookTime: 40 };
    expect(weatherBoost(recipe, 'rainy')).toBe(5);
  });

  it('returns 0 for mild weather', () => {
    const recipe = { title: 'Any Recipe', calories: 500, cookTime: 30 };
    expect(weatherBoost(recipe, 'mild')).toBe(0);
  });

  it('returns 0 for cold day with light recipe and no tag match', () => {
    const recipe = { title: 'Light Snack', calories: 200, cookTime: 5 };
    expect(weatherBoost(recipe, 'cold')).toBe(0);
  });
});
