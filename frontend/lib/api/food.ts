// P9 — extracted from lib/api.ts (firstCookStats + cookCompleteSignals + discoveryMilestones + cookingHistoryStats + stripe + branded food)
import { apiClient } from './core';

// ─── First-cook-of-cuisine stats (J2) ────────────────────────────────────────

export interface FirstCookStatsPayload {
  isFirstCook: boolean;
  cuisinesCookedCount: number;
  totalCuisinesAvailable: number;
}

export const firstCookStatsApi = {
  get: (cuisine: string) =>
    apiClient.get<FirstCookStatsPayload>(
      `/first-cook-stats?cuisine=${encodeURIComponent(cuisine)}`,
    ),
};

// ─── Cook-complete signals (J14 + J16) ───────────────────────────────────────

export type CookCompleteIntensity = 'big' | 'medium' | 'quiet';

export interface CookCompleteSignalsPayload {
  intensity: CookCompleteIntensity;
  recapInsight: string | null;
}

export interface CookCompleteSignalsQuery {
  cuisine?: string;
  recipeId?: string;
  rating?: number;
}

export const cookCompleteSignalsApi = {
  get: (q: CookCompleteSignalsQuery) => {
    const params = new URLSearchParams();
    if (q.cuisine) params.set('cuisine', q.cuisine);
    if (q.recipeId) params.set('recipeId', q.recipeId);
    if (typeof q.rating === 'number') params.set('rating', String(q.rating));
    const qs = params.toString();
    return apiClient.get<CookCompleteSignalsPayload>(
      `/cook-complete-signals${qs ? `?${qs}` : ''}`,
    );
  },
};

// ─── Discovery milestones (J5) ───────────────────────────────────────────────

export interface MarkMilestonePayload {
  newlyAchieved: boolean;
  alreadyAchieved: boolean;
}

export interface MilestonesListPayload {
  achieved: string[];
}

export const discoveryMilestonesApi = {
  mark: (key: string) =>
    apiClient.post<MarkMilestonePayload>('/discovery-milestones', { key }),
  list: () => apiClient.get<MilestonesListPayload>('/discovery-milestones'),
};

// ─── Cooking history stats (J11) ─────────────────────────────────────────────

export interface MostRecentCookPayload {
  mostRecent: {
    cookedAt: string;
    recipe: { id: string; title: string; cuisine: string | null };
  } | null;
}

export const cookingHistoryStatsApi = {
  mostRecent: () =>
    apiClient.get<MostRecentCookPayload>('/cooking-logs/most-recent'),
};

// ─── Stripe / Subscriptions (Group 7) ────────────────────────────────────────

export const stripeApi = {
  getSubscription: () => apiClient.get('/stripe/subscription'),
  createCheckout: (interval: 'month' | 'year') =>
    apiClient.post('/stripe/checkout', { interval }),
  createPortal: () => apiClient.post('/stripe/portal'),
  cancelSubscription: (payload: {
    reason: 'too_expensive' | 'not_using' | 'missing_feature' | 'other';
    feedback?: string;
    action: 'cancel' | 'pause';
  }) => apiClient.post('/stripe/cancel', payload),
};

// 10L: Branded Food & Restaurant Tracking
export const foodApi = {
  search: (query: string) =>
    apiClient.get(`/food/search?q=${encodeURIComponent(query)}`),
  getRecent: () => apiClient.get('/food/recent'),
  getFrequent: () => apiClient.get('/food/frequent'),
  logFood: (data: {
    foodItemId: string;
    mealType: string;
    servings?: number;
    date?: string;
  }) => apiClient.post('/food/log', data),
  createItem: (data: {
    name: string;
    brand?: string;
    category?: string;
    servingSize?: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  }) => apiClient.post('/food/items', data),
};
