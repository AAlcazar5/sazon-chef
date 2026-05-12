// P9 — extracted from lib/api.ts (Build-a-Plate types + mealComponent + leftovers + nutrition + social + plate + household + sharedPlates)
import { apiClient } from './core';

// ─── Build-a-Plate (Group 10X Phase 1) ───────────────────────────────────────

export type MealComponentSlot = 'protein' | 'base' | 'vegetable' | 'sauce' | 'garnish';
export type CookMethodHint = 'roast' | 'pan_sear' | 'simmer' | 'raw' | 'mix' | 'grill' | 'bake';

export interface MealComponent {
  id: string;
  slot: MealComponentSlot;
  name: string;
  description?: string;
  defaultPortionGrams: number;
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  estimatedCostPerPortion?: number;
  cuisineTags: string[];
  dietaryTags: string[];
  cookMethodHint: CookMethodHint;
  pantryIngredientNames: string[];
  imageUrl?: string;
  pantryCoveragePercent: number;
}

export interface ComposedPlatePayload {
  components: { slot: string; componentId: string; portionMultiplier: number }[];
  name?: string;
  saveAsRecipe: boolean;
}

export interface ComposedPlateResponse {
  id: string;
  name?: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  pantryCoveragePercent: number;
  recipeId?: string;
}

export interface PermutationCandidate {
  id: string;
  components: {
    slot: MealComponentSlot;
    component: MealComponent;
    portionMultiplier: number;
  }[];
  coherenceScore: number;
  pantryCoveragePercent: number;
  macroFitScore: number | null;
}

export interface PermutationsBody {
  lockedSlots: { slot: MealComponentSlot; componentId: string }[];
  slotsToFill: MealComponentSlot[];
  maxResults: number;
  prioritizePantry: boolean;
}

export type SkillTier = 'beginner' | 'cook' | 'chef';

export interface SkillTierResponse {
  tier: SkillTier;
  visibleSlots: MealComponentSlot[];
}

export interface ComponentVariantResponse {
  id: string;
  variantKey: string;
  label: string;
  compatibilityScore: number;
  caloriesDeltaPerPortion?: number;
  cookTimeMinutes?: number;
}

export interface AutoFitTarget {
  calories: number;
  protein: number;
}

export interface AutoFitLockedSlot {
  slot: MealComponentSlot;
  componentId: string;
  portionMultiplier: number;
}

export interface AutoFitBody {
  target: AutoFitTarget;
  lockedSlots: AutoFitLockedSlot[];
  slotsToFill: MealComponentSlot[];
}

export interface AutoFitFilledSlot {
  slot: MealComponentSlot;
  component: MealComponent;
  portionMultiplier: number;
}

export interface AutoFitResult {
  achievable: boolean;
  filled: AutoFitFilledSlot[];
  totals?: { calories: number; protein: number; carbs: number; fat: number };
  gap?: { calories: number; protein: number };
}

// "Tune the plate" — min/max bounds on any subset of macros (cal/p/c/f/fiber).
// At least one bound must be specified. The solver returns the highest-quality
// plate whose totals stay within every bound (or the closest combo when no
// candidate respects all of them).
export type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber';

export interface MacroBound {
  /** Lower bound — totals[macro] must be >= min */
  min?: number;
  /** Upper bound — totals[macro] must be <= max */
  max?: number;
}

export type MacroBounds = Partial<Record<MacroKey, MacroBound>>;

export interface MacroBoundsBody {
  bounds: MacroBounds;
  lockedSlots: AutoFitLockedSlot[];
  slotsToFill: MealComponentSlot[];
}

export interface MacroBoundsFilledSlot {
  slot: MealComponentSlot;
  component: MealComponent;
  portionMultiplier: number;
}

export interface BoundsViolation {
  type: 'over' | 'under';
  amount: number;
}

export interface MacroBoundsResult {
  achievable: boolean;
  filled: MacroBoundsFilledSlot[];
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  /** Per-macro violation. Only present when achievable=false. */
  outOfBounds?: Partial<Record<MacroKey, BoundsViolation>>;
}

// Build-a-Plate Phase 10 — POST /api/macros/estimate response shape.
// Server returns the EstimateResult shape directly (no envelope) — see
// backend/src/modules/macros/macrosController.ts.
export type MacroEstimateSource = 'usda' | 'ai' | 'fallback';
export type MacroEstimateConfidence = 'high' | 'estimated' | 'unknown';

export interface MacroEstimateResult {
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  source: MacroEstimateSource;
  confidence: MacroEstimateConfidence;
  matchedName?: string;
}

export const mealComponentApi = {
  list: (params?: { slot?: MealComponentSlot; dietary?: string; cuisine?: string; q?: string }) =>
    apiClient.get<{ components: MealComponent[] }>('/meal-components', { params }),
  permutations: (body: PermutationsBody) =>
    apiClient.post<{ permutations: PermutationCandidate[] }>('/meal-components/permutations', body),
  plateFromPantry: () =>
    apiClient.get<{ plate: PermutationCandidate | null }>('/meal-components/plate-from-pantry'),
  affinity: (params: { slot: MealComponentSlot; limit?: number }) =>
    apiClient.get<{ slot: string; favorites: { componentId: string; score: number }[] }>('/meal-components/affinity', { params }),
  swapAway: (componentId: string) =>
    apiClient.post<{ ok: true }>(`/meal-components/${componentId}/swap-away`, {}),
  skillTier: () =>
    apiClient.get<SkillTierResponse>('/meal-components/skill-tier'),
  variants: (componentId: string) =>
    apiClient.get<{ variants: ComponentVariantResponse[] }>(`/meal-components/${componentId}/variants`),
  estimateMacros: (body: { name: string; portionGrams: number; slot: MealComponentSlot }) =>
    apiClient.post<MacroEstimateResult>('/macros/estimate', body),
};

export interface LeftoverInventoryItem {
  id: string;
  componentId: string;
  slot: MealComponentSlot;
  name: string;
  portionsRemaining: number;
  expiresAt?: string;
}

export const leftoverInventoryApi = {
  list: (params?: { slot?: MealComponentSlot }) =>
    apiClient.get<{ leftovers: LeftoverInventoryItem[] }>('/leftover-inventory', { params }),
};

export type TrackedNutrient = 'fiberG' | 'omega3G' | 'vitaminDIu' | 'ironMg' | 'magnesiumMg';

export interface NutrientGapResponse {
  topGap: TrackedNutrient | null;
  pctRemainingByNutrient: Record<TrackedNutrient, number>;
  targets: Record<TrackedNutrient, number>;
}

export const nutrientGapApi = {
  fetchTopGap: () =>
    apiClient.get<NutrientGapResponse>('/nutrient-gap/top'),
};

// ─── ROADMAP 4.0 D14 — Nutrition discovery ──────────────────────────────────

export interface RecipeNutritionAggregate {
  recipeId: string;
  servings: number;
  ingredientCoverage: number;
  invalidated: boolean;
  computedAt: string;
  [nutrient: string]: number | string | boolean | null;
}

export interface DailyNutritionSnapshot {
  userId: string;
  date: string;
  mealCount: number;
  computedAt: string;
  [nutrient: string]: number | string | null;
}

export const nutritionApi = {
  fetchRecipe: (recipeId: string) =>
    apiClient.get<{ aggregate: RecipeNutritionAggregate }>(`/nutrition/recipe/${recipeId}`),
  fetchDaily: (date?: string) =>
    apiClient.get<{ snapshot: DailyNutritionSnapshot }>(
      '/nutrition/daily',
      { params: date ? { date } : undefined },
    ),
};

// ─── ROADMAP 4.0 F1 — Friends feed ──────────────────────────────────────────

export interface FriendsFeedItem {
  plateId: string;
  ownerId: string;
  ownerName: string | null;
  plateName: string | null;
  shareSlug: string | null;
  score: {
    pantryCoverage: number;
    dietaryCompatibility: number;
    slotAffinityOverlap: number;
    composite: number;
  };
  createdAt: string;
}

export interface FollowSummary {
  userId: string;
  followingCount: number;
  followerCount: number;
}

export const followsApi = {
  follow: (userId: string) => apiClient.post(`/follows/${userId}`),
  unfollow: (userId: string) => apiClient.delete(`/follows/${userId}`),
  status: (userId: string) =>
    apiClient.get<{ following: boolean }>(`/follows/${userId}/status`),
  summary: () => apiClient.get<{ summary: FollowSummary }>('/follows/summary'),
  feed: () => apiClient.get<{ items: FriendsFeedItem[] }>('/follows/feed'),
};

export interface ComposedPlateSaveResponse {
  plate: ComposedPlateResponse;
  recipe?: { id: string };
}

export interface TimelineEvent {
  componentId: string;
  name: string;
  action: 'start' | 'finish' | 'plate';
  atMinuteFromStart: number;
  equipmentUsed: string[];
}

export interface ParallelTimeline {
  totalMinutes: number;
  events: TimelineEvent[];
  equipmentConflicts: {
    equipment: string;
    overlappingComponentIds: [string, string];
  }[];
}

// ─── Plate-of-the-week & variations & utterance composer (Phase 7+8) ────────

export interface PlateOfTheWeek {
  id: string;
  title: string;
  imageUrl?: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  region?: string;
  saveCount?: number;
  /** Personalization rationale (only present when viewer is authenticated). */
  reason?: string;
}

export interface PlateVariation {
  id: string;
  title: string;
  swappedSlot: MealComponentSlot;
  swappedFrom: string;
  swappedTo: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface UtteranceComposeResponse {
  plate: { id: string };
}

export const composedPlateApi = {
  save: (payload: ComposedPlatePayload) =>
    apiClient.post<ComposedPlateSaveResponse>('/composed-plates', payload),

  timeline: (plateId: string) =>
    apiClient.post<{ timeline: ParallelTimeline }>(`/composed-plates/${plateId}/timeline`, {}),

  autoFit: (body: AutoFitBody) =>
    apiClient.post<{ result: AutoFitResult }>('/composed-plates/auto-fit', body),

  withinBounds: (body: MacroBoundsBody) =>
    apiClient.post<{ result: MacroBoundsResult }>('/composed-plates/within-bounds', body),

  fetchOfTheWeek: () =>
    apiClient.get<{ plate: PlateOfTheWeek | null }>('/composed-plates/of-the-week'),

  fetchVariations: (plateId: string) =>
    apiClient.get<{ variations: PlateVariation[] }>(`/composed-plates/${plateId}/variations`),

  composeFromUtterance: (utterance: string) =>
    apiClient.post<UtteranceComposeResponse>('/composed-plates/from-utterance', { utterance }),

  weeklySummary: () =>
    apiClient.get<{ totalPlatesThisWeek: number; greenVegCount: number }>(
      '/composed-plates/weekly-summary',
    ),

  family: (body: FamilyMealBody) =>
    apiClient.post<{ familyMeal: FamilyMealResponse; persisted?: PersistedFamilyMeal }>(
      '/composed-plates/family',
      body,
    ),

  diverge: (body: DivergeBody) =>
    apiClient.post<{ plates: FamilyPlatePayload[] }>(
      '/composed-plates/diverge',
      body,
    ),
};

// ─── Family meal types ──────────────────────────────────────────────────────

export interface FamilyPlateComponentPayload {
  slot: MealComponentSlot;
  componentId: string;
  portionMultiplier: number;
}

export interface FamilyPlatePayload {
  plateId: string;
  components: FamilyPlateComponentPayload[];
}

export interface FamilyMealBody {
  plates: Array<FamilyPlatePayload & { householdMemberId?: string }>;
  name?: string;
  persist?: boolean;
}

export interface MergedCookStep {
  componentId: string;
  totalPortions: number;
  servesPlateIds: string[];
  slot: MealComponentSlot;
}

export interface FamilyMealResponse {
  userId: string;
  plates: FamilyPlatePayload[];
  cookSteps: MergedCookStep[];
}

export interface PersistedFamilyMeal {
  id: string;
  userId: string;
  name: string | null;
  cookSteps: MergedCookStep[];
  plateIds: string[];
}

export interface DivergeBody {
  sharedSlots: { slot: MealComponentSlot; componentId: string }[];
  perPlateDivergentSlots: {
    plateId: string;
    slots: { slot: MealComponentSlot; componentId: string }[];
  }[];
}

// ─── Household roster (Group 10X Phase 7) ───────────────────────────────────

export type AgeBand = 'toddler' | 'kid' | 'teen' | 'adult' | 'elder';

export interface HouseholdMember {
  id: string;
  userId: string;
  displayName: string;
  ageBand: AgeBand;
  pickinessLevel: number;
  dietaryFlags: string[];
  bannedComponentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMemberInput {
  displayName: string;
  ageBand: AgeBand;
  pickinessLevel?: number;
  dietaryFlags?: string[];
  bannedComponentIds?: string[];
}

export const householdApi = {
  list: () =>
    apiClient.get<{ members: HouseholdMember[] }>('/household'),
  create: (body: HouseholdMemberInput) =>
    apiClient.post<{ member: HouseholdMember }>('/household', body),
  update: (id: string, body: Partial<HouseholdMemberInput>) =>
    apiClient.patch<{ member: HouseholdMember }>(
      `/household/${encodeURIComponent(id)}`,
      body,
    ),
  remove: (id: string) =>
    apiClient.delete<void>(`/household/${encodeURIComponent(id)}`),
};

// ─── Shared Plates (Group 10X Phase 8 — deep link routing) ───────────────────

export interface SharedPlatePayload {
  id: string;
  slug: string;
  plate: {
    id: string;
    userId?: string;
    componentIds?: string;
    [key: string]: unknown;
  } | null;
  author?: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface SharedPlateResponse {
  share: SharedPlatePayload;
}

export const sharedPlatesApi = {
  fetchBySlug: (slug: string) =>
    apiClient.get<SharedPlateResponse>(`/shared-plates/${encodeURIComponent(slug)}`),
  fetchSubCount: (slug: string) =>
    apiClient.get<{ subsCount: number }>(
      `/shared-plates/${encodeURIComponent(slug)}/sub-count`,
    ),
};
