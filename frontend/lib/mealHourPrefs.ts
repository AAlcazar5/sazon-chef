import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MealHours {
  breakfast: number;
  lunch: number;
  snack: number;
  dinner: number;
  dessert?: number;
}

export const DEFAULT_MEAL_HOURS: MealHours = {
  breakfast: 7,
  lunch: 12,
  snack: 15,
  dinner: 18,
};

const STORAGE_KEY = 'meal_hour_prefs_v1';

function clampHour(n: unknown, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(23, Math.max(0, Math.round(v)));
}

export async function getMealHours(): Promise<MealHours> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MEAL_HOURS };
    const parsed = JSON.parse(raw) as Partial<MealHours>;
    return {
      breakfast: clampHour(parsed.breakfast, DEFAULT_MEAL_HOURS.breakfast),
      lunch: clampHour(parsed.lunch, DEFAULT_MEAL_HOURS.lunch),
      snack: clampHour(parsed.snack, DEFAULT_MEAL_HOURS.snack),
      dinner: clampHour(parsed.dinner, DEFAULT_MEAL_HOURS.dinner),
      ...(parsed.dessert != null
        ? { dessert: clampHour(parsed.dessert, 21) }
        : {}),
    };
  } catch {
    return { ...DEFAULT_MEAL_HOURS };
  }
}

export async function setMealHours(hours: MealHours): Promise<void> {
  const sanitized: MealHours = {
    breakfast: clampHour(hours.breakfast, DEFAULT_MEAL_HOURS.breakfast),
    lunch: clampHour(hours.lunch, DEFAULT_MEAL_HOURS.lunch),
    snack: clampHour(hours.snack, DEFAULT_MEAL_HOURS.snack),
    dinner: clampHour(hours.dinner, DEFAULT_MEAL_HOURS.dinner),
    ...(hours.dessert != null ? { dessert: clampHour(hours.dessert, 21) } : {}),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
}

export function formatHour12(hour: number): string {
  const h = ((hour + 24) % 24);
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}
