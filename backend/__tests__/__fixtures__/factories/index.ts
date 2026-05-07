// ROADMAP 4.0 N11.2 — Shared fixture factories.
//
// Each tier defined its own ad-hoc fixtures; centralizing reduces test setup
// code by ~40% across new tiers. Shared fixture drift becomes one fix, not
// 60. Future writers (FX/IG/WK/HX/RD test suites) import from here instead
// of inlining `record({ userId: 'u1', ... })` helpers.

import type { ProposalRecord } from '../../../src/services/recommender/recommenderEventService';

export interface PersonalizationContextFixture {
  userId: string;
  /** Recent cook count — drives signal-coverage tier per N2.1. */
  cookCount: number;
  /** Days since signup — drives activation-cliff math per N12. */
  daysSinceSignup: number;
  pantry: string[];
  expiringItems: Array<{ name: string; daysUntilExpiry: number }>;
  recentCuisines: string[];
  /** Aggregate signal-coverage tier. */
  signalCoverage: 'cold' | 'mid' | 'high';
  goalPhase: 'cut' | 'maintain' | 'bulk' | 'recomp';
  nutritionUIDensity: 'minimal' | 'macros' | 'macros+micros' | 'power-user';
}

export function makePersonalizationContext(
  overrides: Partial<PersonalizationContextFixture> = {},
): PersonalizationContextFixture {
  return {
    userId: 'u-test',
    cookCount: 12,
    daysSinceSignup: 30,
    pantry: ['rice', 'olive oil', 'garlic'],
    expiringItems: [],
    recentCuisines: ['Italian', 'Mediterranean'],
    signalCoverage: 'high',
    goalPhase: 'maintain',
    nutritionUIDensity: 'macros',
    ...overrides,
  };
}

/**
 * Variants for the canonical signal-coverage tiers (N2.1). Each one preserves
 * the rest of the fixture so per-test overrides only need the field they care about.
 */
export const ColdContext = (over?: Partial<PersonalizationContextFixture>) =>
  makePersonalizationContext({
    cookCount: 1,
    daysSinceSignup: 2,
    signalCoverage: 'cold',
    recentCuisines: [],
    ...over,
  });

export const MidContext = (over?: Partial<PersonalizationContextFixture>) =>
  makePersonalizationContext({
    cookCount: 5,
    daysSinceSignup: 14,
    signalCoverage: 'mid',
    recentCuisines: ['Italian'],
    ...over,
  });

export const HighContext = (over?: Partial<PersonalizationContextFixture>) =>
  makePersonalizationContext({
    cookCount: 20,
    daysSinceSignup: 60,
    signalCoverage: 'high',
    recentCuisines: ['Italian', 'Mediterranean', 'Persian'],
    ...over,
  });

// ── RecommenderEvent ────────────────────────────────────────────────────────

export function makeProposalRecord(
  overrides: Partial<ProposalRecord> = {},
): ProposalRecord {
  return {
    userId: 'u-test',
    asOf: new Date('2026-05-06T18:00:00Z'),
    contextSnapshot: { tasteSummary: 'italian-leaning' } as any,
    candidateIds: ['r-1', 'r-2', 'r-3'],
    pickedRecipeId: 'r-1',
    runnerUpIds: ['r-2', 'r-3'],
    confidence: 0.82,
    copyLine: 'Carbonara again — it never gets old',
    source: 'llm',
    ...overrides,
  };
}

export interface UnifiedEventFixture {
  userId: string;
  surface: string;
  eventType: string;
  asOf?: Date;
  retrievalCallId?: string;
  pickedRecipeId?: string;
  metadata?: Record<string, unknown>;
  position?: number;
  confidence?: number;
  copyLine?: string;
  source?: string;
}

export function makeRecommenderEvent(
  overrides: Partial<UnifiedEventFixture> = {},
): UnifiedEventFixture {
  return {
    userId: 'u-test',
    surface: 'today_hero',
    eventType: 'impression',
    asOf: new Date('2026-05-06T18:00:00Z'),
    pickedRecipeId: 'r-1',
    confidence: 0.8,
    copyLine: 'Carbonara again — it never gets old',
    source: 'llm',
    ...overrides,
  };
}

// ── PantryItem ──────────────────────────────────────────────────────────────

export interface PantryItemFixture {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  source: 'manual' | 'shopping' | 'cooking';
  createdAt: Date;
  updatedAt: Date;
}

export function makePantryItem(
  overrides: Partial<PantryItemFixture> = {},
): PantryItemFixture {
  return {
    id: 'p-test',
    userId: 'u-test',
    name: 'rice',
    category: null,
    source: 'manual',
    createdAt: new Date('2026-04-29T00:00:00Z'),
    updatedAt: new Date('2026-04-29T00:00:00Z'),
    ...overrides,
  };
}

// ── WeekPlan ────────────────────────────────────────────────────────────────

export interface WeekPlanSlotFixture {
  date: string; // ISO date
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId: string | null;
}

export interface WeekPlanFixture {
  userId: string;
  weekStartDate: string; // ISO date
  slots: WeekPlanSlotFixture[];
}

export function makeWeekPlan(
  overrides: Partial<WeekPlanFixture> = {},
): WeekPlanFixture {
  const weekStart = overrides.weekStartDate ?? '2026-05-04';
  const slots: WeekPlanSlotFixture[] =
    overrides.slots ??
    Array.from({ length: 7 }, (_, day) => {
      const date = new Date(`${weekStart}T00:00:00Z`);
      date.setDate(date.getDate() + day);
      return {
        date: date.toISOString().slice(0, 10),
        meal: 'dinner' as const,
        recipeId: `r-${day}`,
      };
    });
  return {
    userId: overrides.userId ?? 'u-test',
    weekStartDate: weekStart,
    slots,
  };
}
