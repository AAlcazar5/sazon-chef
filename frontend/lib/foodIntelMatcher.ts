// Group 10R: Tip matching engine.
// Ranks tips by user-state relevance (cuisine affinity × nutrient gap × skill tier
// × goal phase × ingredient novelty), with seen-set dedup and engagement feedback.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FOOD_INTEL_TIPS,
  type FoodIntelTip,
  type FoodIntelSkillTier,
  type FoodIntelGoalPhase,
} from './foodIntelTips';

// ── Public types ────────────────────────────────────────────────────────────

export type ScreenType = 'recipe' | 'cooking' | 'home' | 'shopping' | 'meal-plan';

export interface TipContext {
  ingredients: string[];
  screenType: ScreenType;
  /** Optional: a specific nutrient the surface wants to highlight */
  nutrient?: string;
  /** Optional: limits matching to a single trigger (e.g. shopping check-off) */
  trigger?: string;
}

export interface UserState {
  userId: string;
  cookHistory: { cuisines: string[] };
  topAffinityIngredients: string[];
  rolling7dNutrientGaps: string[];
  skillTier: FoodIntelSkillTier;
  goalPhase: FoodIntelGoalPhase;
  /** Optional: ingredient → first-seen timestamp; used for novelty scoring */
  ingredientFirstSeenAt?: Record<string, string>;
  /** Optional: shopping purchaseCount per item, for tier-by-purchase tip depth */
  purchaseCount?: Record<string, number>;
  /** Group 10R-Phase2: distinct ingredient names cooked in the last 7 days. */
  last7DaysIngredients?: string[];
}

export type EngagementSignal = 'expanded' | 'dismissed' | 'ignored';

export interface SeenTipEntry {
  tipId: string;
  signal: EngagementSignal;
  timestamp: number;
}

export type SeenTipMap = Record<string, SeenTipEntry>;

// ── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'food_intel_seen_v1';
const SEEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const storageKey = (userId: string): string => `${STORAGE_PREFIX}::${userId}`;

function isSeenTipEntry(value: unknown): value is SeenTipEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.tipId === 'string' &&
    typeof v.timestamp === 'number' &&
    (v.signal === 'expanded' || v.signal === 'dismissed' || v.signal === 'ignored')
  );
}

export async function loadSeenTipIds(userId: string): Promise<SeenTipMap> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const now = Date.now();
    const fresh: SeenTipMap = {};
    for (const [id, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (isSeenTipEntry(entry) && now - entry.timestamp <= SEEN_TTL_MS) {
        fresh[id] = entry;
      }
    }
    return fresh;
  } catch {
    return {};
  }
}

export async function recordTipEngagement(
  userId: string,
  tipId: string,
  signal: EngagementSignal
): Promise<void> {
  const current = await loadSeenTipIds(userId);
  const next: SeenTipMap = {
    ...current,
    [tipId]: { tipId, signal, timestamp: Date.now() },
  };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
}

export async function clearSeenTipIds(userId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}

// ── Pure ranker ─────────────────────────────────────────────────────────────

interface RankInput {
  context: TipContext;
  userState: UserState;
  seen: SeenTipMap;
}

const SCORE_WEIGHTS = {
  triggerMatch: 100,
  ingredientMatch: 50,
  nutrientGap: 60,
  ctxNutrient: 40,
  cuisineAffinity: 30,
  goalPhase: 15,
  noveltyIngredient: 20,
  skillTierFit: 10,
  expandedBoost: 25,
  dismissedPenalty: -200,
} as const;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function scoreTip(tip: FoodIntelTip, input: RankInput): number {
  const { context, userState, seen } = input;
  let score = 0;

  // Skill tier hard filter: if tip declares tiers and user's tier isn't in them, skip.
  if (
    tip.personalizationKeys.skillTier.length > 0 &&
    !tip.personalizationKeys.skillTier.includes(userState.skillTier)
  ) {
    return -Infinity;
  }

  // Trigger / ingredient match (the strongest signal — relevance to the screen).
  const ingsLower = context.ingredients.map(normalize);
  const tipTrigger = normalize(tip.trigger);
  const tipTags = tip.tags.map(normalize);

  if (context.trigger && normalize(context.trigger) === tipTrigger) {
    score += SCORE_WEIGHTS.triggerMatch;
  } else if (ingsLower.includes(tipTrigger)) {
    score += SCORE_WEIGHTS.triggerMatch;
  }
  for (const ing of ingsLower) {
    if (tipTags.includes(ing)) score += SCORE_WEIGHTS.ingredientMatch;
  }

  // Nutrient gap (rolling 7-day deficit).
  for (const gap of userState.rolling7dNutrientGaps.map(normalize)) {
    if (tip.personalizationKeys.nutrient.map(normalize).includes(gap)) {
      score += SCORE_WEIGHTS.nutrientGap;
    }
  }

  // Context nutrient (surface explicitly asked).
  if (context.nutrient) {
    const ctxNut = normalize(context.nutrient);
    if (tip.personalizationKeys.nutrient.map(normalize).includes(ctxNut)) {
      score += SCORE_WEIGHTS.ctxNutrient;
    }
  }

  // Cuisine affinity from cook history (count of cooks per cuisine).
  const cuisineCounts: Record<string, number> = {};
  for (const c of userState.cookHistory.cuisines.map(normalize)) {
    cuisineCounts[c] = (cuisineCounts[c] ?? 0) + 1;
  }
  for (const tipCuisine of tip.personalizationKeys.cuisine.map(normalize)) {
    const count = cuisineCounts[tipCuisine] ?? 0;
    if (count > 0) score += SCORE_WEIGHTS.cuisineAffinity * Math.min(count, 5);
  }

  // Goal phase alignment.
  if (
    tip.personalizationKeys.goalPhase.includes(userState.goalPhase) ||
    tip.personalizationKeys.goalPhase.includes('any')
  ) {
    score += SCORE_WEIGHTS.goalPhase;
  }

  // Ingredient novelty: tip's trigger is in context ingredients AND user has never cooked it.
  if (ingsLower.includes(tipTrigger)) {
    const firstSeen = userState.ingredientFirstSeenAt?.[tipTrigger];
    const isNovel =
      !firstSeen && !userState.topAffinityIngredients.map(normalize).includes(tipTrigger);
    if (isNovel) score += SCORE_WEIGHTS.noveltyIngredient;
  }

  // Skill tier fit (if user is the only tier listed, slight boost — tip is purpose-built).
  if (
    tip.personalizationKeys.skillTier.length === 1 &&
    tip.personalizationKeys.skillTier[0] === userState.skillTier
  ) {
    score += SCORE_WEIGHTS.skillTierFit;
  }

  // Engagement feedback.
  const seenEntry = seen[tip.id];
  if (seenEntry) {
    if (seenEntry.signal === 'dismissed') score += SCORE_WEIGHTS.dismissedPenalty;
    else if (seenEntry.signal === 'expanded') score += SCORE_WEIGHTS.expandedBoost;
  }

  return score;
}

interface ScoredTip {
  tip: FoodIntelTip;
  score: number;
}

function scoreAndSort(
  tips: readonly FoodIntelTip[],
  input: RankInput,
): ScoredTip[] {
  const scored = tips.map((tip) => ({ tip, score: scoreTip(tip, input) }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.tip.id.localeCompare(b.tip.id);
  });
  return scored.filter((s) => s.score > -Infinity);
}

export function rankFoodIntelTips(
  tips: readonly FoodIntelTip[],
  input: RankInput
): FoodIntelTip[] {
  return scoreAndSort(tips, input).map((s) => s.tip);
}

// ── Async matcher (the public surface) ──────────────────────────────────────

export interface MatchOptions {
  /** Maximum number of tips returned (default 2). */
  limit?: number;
  /** When true, dismissed tips are excluded entirely (otherwise just down-ranked). */
  excludeDismissed?: boolean;
}

export async function matchFoodIntelTips(
  context: TipContext,
  userState: UserState,
  options: MatchOptions = {}
): Promise<FoodIntelTip[]> {
  const limit = options.limit ?? 2;
  const excludeDismissed = options.excludeDismissed ?? true;
  const seen = await loadSeenTipIds(userState.userId);

  const scored = scoreAndSort(FOOD_INTEL_TIPS, { context, userState, seen });
  const pool = excludeDismissed
    ? scored.filter((s) => seen[s.tip.id]?.signal !== 'dismissed')
    : scored;

  if (pool.length === 0) return [];

  // Primary path: at least one tip has a meaningful context-relevant score.
  if (pool[0].score >= SCORE_WEIGHTS.ingredientMatch) {
    return pool.slice(0, limit).map((s) => s.tip);
  }

  // Fallback: rank by user's cuisine affinity only (no ingredient context). Never random.
  const fallback = scoreAndSort(FOOD_INTEL_TIPS, {
    context: { ingredients: [], screenType: context.screenType },
    userState,
    seen,
  }).filter((s) => (excludeDismissed ? seen[s.tip.id]?.signal !== 'dismissed' : true));

  return fallback.slice(0, limit).map((s) => s.tip);
}
