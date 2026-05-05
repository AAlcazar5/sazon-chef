// frontend/hooks/useBudget.ts
// Unified budget source of truth. Consolidates the duplicated userApi.getPreferences()
// calls that previously lived in both meal-plan.tsx and shopping-list.tsx.
//
// Exposes both the static user-configured targets (grocery dollars, macro goals) AND
// the dynamic this-week state from GET /api/meal-plan/weekly-budget (consumed vs.
// remaining, adjusted per-day target that redistributes prior surplus/deficit).
import { useCallback, useEffect, useState } from 'react';
import { userApi, mealPlanApi } from '../lib/api';

export interface WeeklyBudgetSnapshot {
  weekStart: string;
  weekEnd: string;
  daysRemaining: number;
  targets: {
    dailyCalories: number;
    dailyProtein: number;
    weeklyCalories: number;
    weeklyProtein: number;
  };
  consumed: { calories: number; protein: number };
  remaining: { calories: number; protein: number };
  adjusted: {
    todayCalories: number;
    todayProtein: number;
    deltaCalories: number;
    deltaProtein: number;
  };
}

export interface BudgetValues {
  weeklyGrocery: number | null;
  dailyGrocery: number | null;
  dailyCalories: number | null;
  weeklyCalories: number | null;
  dailyProtein: number | null;
  weeklyProtein: number | null;
  weeklyBudget: WeeklyBudgetSnapshot | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

interface UseBudgetOptions {
  autoload?: boolean;
}

export function useBudget(options: UseBudgetOptions = {}): BudgetValues {
  const { autoload = true } = options;
  const [state, setState] = useState<Omit<BudgetValues, 'refresh'>>({
    weeklyGrocery: null,
    dailyGrocery: null,
    dailyCalories: null,
    weeklyCalories: null,
    dailyProtein: null,
    weeklyProtein: null,
    weeklyBudget: null,
    loading: false,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));

    const [prefsResult, weeklyResult] = await Promise.allSettled([
      userApi.getPreferences(),
      mealPlanApi.getWeeklyBudget(),
    ]);

    let weeklyGrocery: number | null = null;
    let dailyCalories: number | null = null;
    let dailyProtein: number | null = null;

    if (prefsResult.status === 'fulfilled') {
      const prefs = prefsResult.value?.data as any;
      weeklyGrocery =
        typeof prefs?.maxDailyFoodBudget === 'number' && prefs.maxDailyFoodBudget > 0
          ? prefs.maxDailyFoodBudget
          : null;
      dailyCalories =
        typeof prefs?.dailyCalorieGoal === 'number' && prefs.dailyCalorieGoal > 0
          ? prefs.dailyCalorieGoal
          : null;
      dailyProtein =
        typeof prefs?.dailyProteinGoal === 'number' && prefs.dailyProteinGoal > 0
          ? prefs.dailyProteinGoal
          : null;
    }

    let weeklyBudget: WeeklyBudgetSnapshot | null = null;
    if (weeklyResult.status === 'fulfilled') {
      const w = weeklyResult.value?.data as any;
      if (w && w.targets && w.consumed && w.remaining && w.adjusted) {
        weeklyBudget = {
          weekStart: w.weekStart,
          weekEnd: w.weekEnd,
          daysRemaining: w.daysRemaining,
          targets: w.targets,
          consumed: w.consumed,
          remaining: w.remaining,
          adjusted: w.adjusted,
        };
      }
    }

    setState({
      weeklyGrocery,
      dailyGrocery: weeklyGrocery != null ? weeklyGrocery / 7 : null,
      dailyCalories,
      weeklyCalories: dailyCalories != null ? dailyCalories * 7 : null,
      dailyProtein,
      weeklyProtein: dailyProtein != null ? dailyProtein * 7 : null,
      weeklyBudget,
      loading: false,
    });
  }, []);

  useEffect(() => {
    if (autoload) {
      void refresh();
    }
  }, [autoload, refresh]);

  return { ...state, refresh };
}
