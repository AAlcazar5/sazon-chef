// frontend/__tests__/hooks/useBudget.test.ts
jest.mock('../../lib/api', () => ({
  userApi: {
    getPreferences: jest.fn(),
  },
  mealPlanApi: {
    getWeeklyBudget: jest.fn(() => Promise.resolve({ data: { targets: null, consumed: null, remaining: null, adjusted: null, daysRemaining: 7, weekStart: '', weekEnd: '' } })),
  },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useBudget } from '../../hooks/useBudget';
import { userApi, mealPlanApi } from '../../lib/api';

const mockGetPreferences = userApi.getPreferences as jest.Mock;
const mockGetWeeklyBudget = mealPlanApi.getWeeklyBudget as jest.Mock;

describe('useBudget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null values when preferences are empty', async () => {
    mockGetPreferences.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weeklyGrocery).toBeNull();
    expect(result.current.dailyGrocery).toBeNull();
    expect(result.current.dailyCalories).toBeNull();
    expect(result.current.weeklyCalories).toBeNull();
    expect(result.current.dailyProtein).toBeNull();
    expect(result.current.weeklyProtein).toBeNull();
  });

  test('maps maxDailyFoodBudget, dailyCalorieGoal, dailyProteinGoal to full shape', async () => {
    mockGetPreferences.mockResolvedValue({
      data: { maxDailyFoodBudget: 140, dailyCalorieGoal: 2100, dailyProteinGoal: 150 },
    });
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weeklyGrocery).toBe(140);
    expect(result.current.dailyGrocery).toBeCloseTo(20, 5);
    expect(result.current.dailyCalories).toBe(2100);
    expect(result.current.weeklyCalories).toBe(14700);
    expect(result.current.dailyProtein).toBe(150);
    expect(result.current.weeklyProtein).toBe(1050);
  });

  test('refresh() re-fetches preferences on demand', async () => {
    mockGetPreferences
      .mockResolvedValueOnce({ data: { maxDailyFoodBudget: 100 } })
      .mockResolvedValueOnce({ data: { maxDailyFoodBudget: 200 } });
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.weeklyGrocery).toBe(100));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.weeklyGrocery).toBe(200);
  });

  test('autoload: false skips initial fetch', () => {
    mockGetPreferences.mockResolvedValue({ data: { maxDailyFoodBudget: 100 } });
    renderHook(() => useBudget({ autoload: false }));
    expect(mockGetPreferences).not.toHaveBeenCalled();
  });

  test('swallows errors and leaves loading=false', async () => {
    mockGetPreferences.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weeklyGrocery).toBeNull();
  });

  test('filters zero/negative budgets as null', async () => {
    mockGetPreferences.mockResolvedValue({
      data: { maxDailyFoodBudget: 0, dailyCalorieGoal: -1, dailyProteinGoal: 0 },
    });
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weeklyGrocery).toBeNull();
    expect(result.current.dailyCalories).toBeNull();
    expect(result.current.dailyProtein).toBeNull();
  });

  test('exposes weeklyBudget from /meal-plan/weekly-budget endpoint', async () => {
    mockGetPreferences.mockResolvedValue({ data: {} });
    mockGetWeeklyBudget.mockResolvedValue({
      data: {
        weekStart: '2026-04-13',
        weekEnd: '2026-04-19',
        daysRemaining: 5,
        targets: { dailyCalories: 2000, dailyProtein: 150, weeklyCalories: 14000, weeklyProtein: 1050 },
        consumed: { calories: 3500, protein: 250 },
        remaining: { calories: 10500, protein: 800 },
        adjusted: { todayCalories: 2100, todayProtein: 160, deltaCalories: 100, deltaProtein: 10 },
      },
    });
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.weeklyBudget).not.toBeNull());
    expect(result.current.weeklyBudget?.daysRemaining).toBe(5);
    expect(result.current.weeklyBudget?.adjusted?.todayCalories).toBe(2100);
    expect(result.current.weeklyBudget?.remaining?.calories).toBe(10500);
  });

  test('weeklyBudget is null when endpoint returns null targets (no macro goals)', async () => {
    mockGetPreferences.mockResolvedValue({ data: {} });
    mockGetWeeklyBudget.mockResolvedValue({
      data: {
        weekStart: '2026-04-13',
        weekEnd: '2026-04-19',
        daysRemaining: 5,
        targets: null,
        consumed: null,
        remaining: null,
        adjusted: null,
      },
    });
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weeklyBudget).toBeNull();
  });

  test('refresh() re-fetches weekly budget too', async () => {
    mockGetPreferences.mockResolvedValue({ data: {} });
    mockGetWeeklyBudget
      .mockResolvedValueOnce({
        data: {
          weekStart: '', weekEnd: '', daysRemaining: 5,
          targets: { dailyCalories: 2000, dailyProtein: 150, weeklyCalories: 14000, weeklyProtein: 1050 },
          consumed: { calories: 0, protein: 0 },
          remaining: { calories: 14000, protein: 1050 },
          adjusted: { todayCalories: 2800, todayProtein: 210, deltaCalories: 800, deltaProtein: 60 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          weekStart: '', weekEnd: '', daysRemaining: 5,
          targets: { dailyCalories: 2000, dailyProtein: 150, weeklyCalories: 14000, weeklyProtein: 1050 },
          consumed: { calories: 500, protein: 30 },
          remaining: { calories: 13500, protein: 1020 },
          adjusted: { todayCalories: 2700, todayProtein: 204, deltaCalories: 700, deltaProtein: 54 },
        },
      });

    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.weeklyBudget?.adjusted?.todayCalories).toBe(2800));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.weeklyBudget?.adjusted?.todayCalories).toBe(2700);
  });
});
