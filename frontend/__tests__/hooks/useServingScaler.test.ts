// frontend/__tests__/hooks/useServingScaler.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useServingScaler } from '../../hooks/useServingScaler';

const BASE_RECIPE = {
  servings: 4,
  calories: 500,
  protein: 30,
  carbs: 60,
  fat: 15,
  fiber: 8,
  estimatedCost: 12,
  cookTime: 30,
};

describe('useServingScaler', () => {
  test('initializes at 1× scale factor with original values', () => {
    const { result } = renderHook(() => useServingScaler(BASE_RECIPE));
    expect(result.current.scaleFactor).toBe(1);
    expect(result.current.scaledServings).toBe(4);
    expect(result.current.scaledMacros).toEqual({
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 15,
      fiber: 8,
    });
    expect(result.current.scaledCost).toBe(12);
    expect(result.current.cookTimeHint).toBeNull();
  });

  test('setScaleFactor(2) doubles all values', () => {
    const { result } = renderHook(() => useServingScaler(BASE_RECIPE));
    act(() => result.current.setScaleFactor(2));
    expect(result.current.scaleFactor).toBe(2);
    expect(result.current.scaledServings).toBe(8);
    expect(result.current.scaledMacros).toEqual({
      calories: 1000,
      protein: 60,
      carbs: 120,
      fat: 30,
      fiber: 16,
    });
    expect(result.current.scaledCost).toBe(24);
  });

  test('setScaleFactor(0.5) halves all values', () => {
    const { result } = renderHook(() => useServingScaler(BASE_RECIPE));
    act(() => result.current.setScaleFactor(0.5));
    expect(result.current.scaleFactor).toBe(0.5);
    expect(result.current.scaledServings).toBe(2);
    expect(result.current.scaledMacros).toEqual({
      calories: 250,
      protein: 15,
      carbs: 30,
      fat: 8, // rounded from 7.5
      fiber: 4,
    });
  });

  test('setCustomServings calculates correct scale factor', () => {
    const { result } = renderHook(() => useServingScaler(BASE_RECIPE));
    act(() => result.current.setCustomServings(6));
    expect(result.current.scaleFactor).toBe(1.5);
    expect(result.current.scaledServings).toBe(6);
    expect(result.current.scaledMacros.calories).toBe(750);
    expect(result.current.scaledMacros.protein).toBe(45);
  });

  test('setCustomServings accepts decimal values', () => {
    const { result } = renderHook(() => useServingScaler(BASE_RECIPE));
    act(() => result.current.setCustomServings(3.5));
    expect(result.current.scaleFactor).toBeCloseTo(0.875);
    expect(result.current.scaledServings).toBe(3.5);
    expect(result.current.scaledMacros.calories).toBe(438); // 500 * 0.875 rounded
  });

  test('hitMyMacros calculates portion to match target calories within 5%', () => {
    const { result } = renderHook(() => useServingScaler(BASE_RECIPE));
    act(() => result.current.hitMyMacros({ targetCalories: 450 }));
    // 450 / 500 = 0.9 scale factor → 3.6 servings
    expect(result.current.scaleFactor).toBeCloseTo(0.9);
    expect(result.current.scaledMacros.calories).toBeCloseTo(450, -1);
  });

  test('hitMyMacros with target protein finds correct scale', () => {
    const { result } = renderHook(() => useServingScaler(BASE_RECIPE));
    act(() => result.current.hitMyMacros({ targetProtein: 45 }));
    // 45 / 30 = 1.5 scale factor
    expect(result.current.scaleFactor).toBeCloseTo(1.5);
    expect(result.current.scaledMacros.protein).toBe(45);
  });

  test('hitMyMacros with both targets uses calories as primary', () => {
    const { result } = renderHook(() => useServingScaler(BASE_RECIPE));
    act(() => result.current.hitMyMacros({ targetCalories: 250, targetProtein: 20 }));
    // Calories-based: 250/500 = 0.5
    expect(result.current.scaleFactor).toBeCloseTo(0.5);
  });

  test('cookTimeHint appears for large batch sizes (>= 2×)', () => {
    const { result } = renderHook(() => useServingScaler(BASE_RECIPE));
    act(() => result.current.setScaleFactor(2));
    expect(result.current.cookTimeHint).toBeTruthy();
    expect(result.current.cookTimeHint).toContain('extra minutes');
  });

  test('cookTimeHint is null for 1× and smaller', () => {
    const { result } = renderHook(() => useServingScaler(BASE_RECIPE));
    expect(result.current.cookTimeHint).toBeNull();
    act(() => result.current.setScaleFactor(0.5));
    expect(result.current.cookTimeHint).toBeNull();
  });

  test('handles recipe with no fiber gracefully', () => {
    const { result } = renderHook(() => useServingScaler({
      ...BASE_RECIPE,
      fiber: undefined,
    }));
    act(() => result.current.setScaleFactor(2));
    expect(result.current.scaledMacros.fiber).toBe(0);
  });

  test('handles recipe with servings=1 correctly', () => {
    const { result } = renderHook(() => useServingScaler({
      ...BASE_RECIPE,
      servings: 1,
    }));
    act(() => result.current.setScaleFactor(4));
    expect(result.current.scaledServings).toBe(4);
    expect(result.current.scaledMacros.calories).toBe(2000);
  });

  test('handles recipe with undefined servings (defaults to 1)', () => {
    const { result } = renderHook(() => useServingScaler({
      ...BASE_RECIPE,
      servings: undefined,
    }));
    expect(result.current.scaledServings).toBe(1);
    act(() => result.current.setScaleFactor(2));
    expect(result.current.scaledServings).toBe(2);
  });

  test('reset returns to 1× scale', () => {
    const { result } = renderHook(() => useServingScaler(BASE_RECIPE));
    act(() => result.current.setScaleFactor(4));
    expect(result.current.scaleFactor).toBe(4);
    act(() => result.current.reset());
    expect(result.current.scaleFactor).toBe(1);
    expect(result.current.scaledServings).toBe(4);
  });
});
