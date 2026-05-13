// P9 — extracted from lib/api.ts (today + activation + reverse-discovery + pantry + notifications + recap + cohortSocialProof)
import { apiClient } from './core';

// ROADMAP 4.0 N12 — Activation cliff surface (Day-3 / Day-7).
export interface ActivationStarterRecipe {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
}
export interface ActivationSurface {
  phase: 'day-3' | 'day-7';
  daysSinceSignup: number;
  recipes: ActivationStarterRecipe[];
  onboardingCuisines: string[];
  headline: string;
  body: string;
}
// ROADMAP 4.0 I2.4 — reverse-discovery payload shape.
export interface ReverseDiscoveryCandidatePayload {
  canonical: string;
  locale: string;
  localName: string;
  availabilityTier: 'common' | 'specialty' | 'rare';
  notes: string | null;
}
export interface ReverseDiscoveryCopyPayload {
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
}
export interface ReverseDiscoveryResponse {
  candidate: ReverseDiscoveryCandidatePayload | null;
  copy: ReverseDiscoveryCopyPayload | null;
}

// P1 retention — cuisine-drought Today card payload.
export interface CuisineDroughtPayload {
  cuisine: string | null;
  daysSince: number | null;
}

// P2 retention — iOS / Android home-screen widget payload.
// Native widget reads this via a SharedDefaults bridge written from JS on
// app foreground (see frontend/widgets/README.md for the bridge contract).
export interface WidgetPayload {
  recipeId: string | null;
  title: string | null;
  imageUrl: string | null;
  cookTime: number | null;
  cuisine: string | null;
  eyebrow: string;
  deepLink: string | null;
}

// P4 retention — cook-pattern card payload.
export interface CookPatternPayload {
  matchesToday: boolean;
  dayName: string | null;
  totalCooks: number;
}

export const todayApi = {
  activation: () =>
    apiClient.get<{ surface: ActivationSurface | null }>('/today/activation'),
  // ROADMAP 4.0 N2.2 — coverage tier for first-7-days surface coordination.
  coverage: () =>
    apiClient.get<{
      tier: 'cold' | 'mid' | 'high';
      recentCookCount: number;
      lifetimeCookCount: number;
      daysSinceSignup: number;
    }>('/today/coverage'),
  // ROADMAP 4.0 I2.4 — "your market has X" reverse-discovery surface.
  // Returns { candidate: null, copy: null } for en/en-US users (no value
  // to add) and unsupported locales — surface auto-hides client-side.
  reverseDiscovery: () =>
    apiClient.get<ReverseDiscoveryResponse>('/today/reverse-discovery'),
  // P1 retention — cuisine drought surface.
  drought: () => apiClient.get<CuisineDroughtPayload>('/today/drought'),
  // P2 retention — widget timeline source.
  widget: () => apiClient.get<WidgetPayload>('/today/widget'),
  // P4 retention — "you usually cook Tuesday nights" behavioral pattern.
  cookPattern: () => apiClient.get<CookPatternPayload>('/today/cook-pattern'),
};

// ROADMAP 4.0 IG8.2 — "Try this ingredient" weekly cultural discovery.
export interface DiscoverySuggestion {
  ingredient: string;
  cuisine: string;
  primerTitle: string | null;
  primerBody: string | null;
  recipeId: string | null;
  recipeTitle: string | null;
}

export const ingredientDiscoveryApi = {
  weekly: () =>
    apiClient.get<{ suggestion: DiscoverySuggestion | null }>(
      '/ingredient-discovery/weekly',
    ),
};

// ROADMAP 4.0 IG10.1 — Pantry IQ editorial card.
export interface PantryIQResponse {
  iq: {
    topCuisine: { cuisine: string; cookCount: number; perWeek: number } | null;
    mostUsed: { ingredientName: string; cookCount: number } | null;
    underused: { ingredientName: string; daysSinceLastUse: number } | null;
    totalCooksInWindow: number;
  } | null;
}

export const pantryIQApi = {
  get: () => apiClient.get<PantryIQResponse>('/pantry-iq'),
};

// Pantry API
export const pantryApi = {
  getAll: () => apiClient.get('/pantry'),
  addItem: (data: { name: string; category?: string }) => apiClient.post('/pantry', data),
  addMany: (items: Array<{ name: string; category?: string }>) => apiClient.post('/pantry/bulk', { items }),
  removeItem: (id: string) => apiClient.delete(`/pantry/${id}`),
  removeByName: (name: string) => apiClient.delete(`/pantry/by-name/${encodeURIComponent(name)}`),
  consume: (ingredients: string[]) => apiClient.post<{ consumed: string[]; unmatched: string[] }>('/pantry/consume', { ingredients }),
  // ROADMAP 4.0 IG4.3 — soon-to-expire pantry items for the use-it-up surface.
  getExpiring: (withinDays: number = 3) =>
    apiClient.get<{
      items: Array<{
        id: string;
        name: string;
        category: string | null;
        quantity: number | null;
        unit: string | null;
        daysUntilExpiry: number;
        expiresAt: string;
        expirySource: 'column' | 'fallback';
        prompt: string;
      }>;
    }>('/pantry/expiring', { params: { withinDays } }),
  // 10H: "What can I make right now?" pantry-based recipe matching
  pantryMatch: (params?: { minMatch?: number; maxMissing?: number; limit?: number }) =>
    apiClient.get<{
      recipes: Array<{
        id: string;
        title: string;
        description: string;
        cuisine: string;
        cookTime: number;
        imageUrl: string | null;
        calories: number;
        protein: number;
        matchPercentage: number;
        missingIngredients: string[];
        canSubstitute: boolean;
      }>;
      pantrySize: number;
    }>('/recipes/pantry-match', { params }),
  leftoverIdeas: (ingredients: string[], options?: { excludeCuisine?: string; excludeRecipeId?: string; limit?: number }) =>
    apiClient.post<{
      recipes: Array<{
        id: string;
        title: string;
        description: string;
        cuisine: string;
        cookTime: number;
        imageUrl: string | null;
        calories: number;
        protein: number;
        reuseCount: number;
      }>;
    }>('/recipes/leftover-ideas', { ingredients, ...options }),
};

// ─── Push Notifications (Group 6) ────────────────────────────────────────────

export const notificationsApi = {
  registerToken: (token: string, platform: string) =>
    apiClient.post('/notifications/register-token', { token, platform }),
  unregisterToken: (token: string) =>
    apiClient.delete('/notifications/unregister-token', { data: { token } }),
};

// ─── ROADMAP 4.0 Tier B3 — Surface event sink ────────────────────────────────

export type SurfaceName =
  | 'today_hero'
  | 'week_swap'
  | 'kitchen_discover'
  | 'sazon_tool'
  | 'smart_collection'
  | 'cravings_made_real'
  | 'new_to_you'
  | 'browse_by_family'
  | 'surprise_me_roulette'
  | 'other';

export type SurfaceAction = 'impression' | 'tap' | 'cook' | 'rate';

export interface SurfaceEventInput {
  surface: SurfaceName;
  action: SurfaceAction;
  recipeId?: string | null;
  variant?: string | null;
}

export const surfaceEventApi = {
  /** Best-effort fire-and-forget. Errors silently ignored — telemetry never blocks UX. */
  record: (event: SurfaceEventInput) =>
    apiClient.post('/telemetry/surface-events', event).catch(() => {}),
  recordBatch: (events: SurfaceEventInput[]) =>
    apiClient.post('/telemetry/surface-events', { events }).catch(() => {}),
};

// ROADMAP 4.0 IA2.8 — Sazon sheet open telemetry.
export type SazonOpenSource =
  | 'fab_tap'
  | 'fab_long_press'
  | 'history_link'
  | 'tab'
  | 'deep_link'
  | 'recipe_detail_pill'
  | 'other';

export interface SazonOpenEvent {
  source: SazonOpenSource;
  contextSeed?: string;
  locale?: string;
  extra?: Record<string, unknown>;
}

export const sazonTelemetryApi = {
  /** Best-effort fire-and-forget. Telemetry never blocks UX. */
  recordOpen: (event: SazonOpenEvent) =>
    apiClient.post('/telemetry/sazon-open', event).catch(() => {}),
};

// ─── ROADMAP 4.0 Tier C7 — Daily check-in ──────────────────────────────────

export interface DailyCheckInUpsertInput {
  date: string;
  nutritionSnapshot?: unknown;
  reflectionText?: string;
  hungerNow?: number;
  energyAtLastMeal?: number;
  satietyFromYesterday?: number;
}

export const dailyCheckInApi = {
  upsert: (input: DailyCheckInUpsertInput) => apiClient.post('/daily-check-in', input),
  list: (limit: number = 7) => apiClient.get(`/daily-check-in?limit=${limit}`),
};

// ─── ROADMAP 4.0 Tier C9 — Weekly recap card ───────────────────────────────

export interface WeeklyRecapPayload {
  userId: string;
  weekStart: string;
  weekEnd: string;
  cookCount: number;
  cuisineCount: number;
  topCuisine: { cuisine: string; count: number } | null;
  topIngredient: { name: string; count: number } | null;
  topNutrient: { name: string; total: number; target: number; percentOfTarget: number } | null;
  discovery: string | null;
}

export const weeklyRecapApi = {
  fetchThisWeek: () => apiClient.get<WeeklyRecapPayload>('/recap/this-week'),
};

// ─── ROADMAP 4.0 Tier C10 — Cultural primer ──────────────────────────────────

export interface CulturalPrimerPayload {
  shouldShow: boolean;
  primer: {
    title: string;
    body: string;
    nutritionalAngle: string;
  } | null;
}

export const culturalPrimerApi = {
  check: (cuisine: string) =>
    apiClient.get<CulturalPrimerPayload>(
      `/cultural-primer/check?cuisine=${encodeURIComponent(cuisine)}`
    ),
};

// ─── Drink pairing (F8) ──────────────────────────────────────────────────────

export interface DrinkPairingPayload {
  /** 2 or 3 lifestyle-voiced pairing suggestions in display order. */
  suggestions: string[];
}

export const drinkPairingApi = {
  get: (cuisine: string) =>
    apiClient.get<DrinkPairingPayload>(
      `/drink-pairing?cuisine=${encodeURIComponent(cuisine)}`,
    ),
};

// ─── Cohort social proof (F9) ────────────────────────────────────────────────

export interface CohortSocialProofPayload {
  proof: {
    cuisine: string;
    uniqueUsers: number;
    copy: string;
  } | null;
}

export const cohortSocialProofApi = {
  get: () => apiClient.get<CohortSocialProofPayload>('/cohort-social-proof'),
};
