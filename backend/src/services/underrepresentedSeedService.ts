// backend/src/services/underrepresentedSeedService.ts
// ROADMAP 4.0 Tier D10 — Underrepresented-cuisine seed run.
//
// Plans + executes the deliberate-acquisition seed batch for the D9
// list. Pure planner (`buildSeedPlan`) + adapter-injectable runner
// (`runSeedBatch`) so the pipeline is testable without LLM calls.
// Each generated recipe must pass D2 quality ≥75 and dedupe (cosine
// sim < DUPLICATE_SIM_THRESHOLD) against existing catalog before
// commit.

import {
  UNDERREPRESENTED,
  UnderrepresentedEntry,
} from '../data/underrepresentedCuisines';
import type { Archetype } from '../data/cuisineArchetypeMatrix';
import { DUPLICATE_SIM_THRESHOLD, cosineSimilarity } from './dedupeScorer';

export const MIN_QUALITY_TO_COMMIT = 75;
export const TARGET_RECIPES_PER_REQUIRED_SLOT = 2;

export interface SlotCoverage {
  canonical: string;
  subCuisine: string | null;
  archetype: Archetype;
  existingCount: number;
}

export interface SeedSlotPlan {
  canonical: string;
  subCuisine: string | null;
  archetype: Archetype;
  required: boolean;
  /** Number of recipes to generate to reach the per-slot target. */
  generateCount: number;
  /** Suggested canonical dish names from D9 to seed prompt variation. */
  candidateDishes: readonly string[];
}

/**
 * Pure planner. Reads the D9 list + current per-slot coverage, returns
 * the queue of (cuisine × archetype) slots that need seeding. Required
 * slots get priority — optional slots only seed when count=0.
 */
export function buildSeedPlan(
  underrepresented: readonly UnderrepresentedEntry[],
  coverage: readonly SlotCoverage[],
): SeedSlotPlan[] {
  const coverageMap = new Map<string, number>();
  for (const c of coverage) {
    const key = `${c.canonical}|${c.subCuisine ?? ''}|${c.archetype}`;
    coverageMap.set(key, c.existingCount);
  }

  const plan: SeedSlotPlan[] = [];
  for (const entry of underrepresented) {
    for (const [archetype, target] of Object.entries(entry.archetypeTargets)) {
      const key = `${entry.canonical}|${entry.subCuisine ?? ''}|${archetype}`;
      const existingCount = coverageMap.get(key) ?? 0;
      const targetCount = target!.required ? TARGET_RECIPES_PER_REQUIRED_SLOT : 1;
      const gap = targetCount - existingCount;
      if (gap <= 0) continue;
      plan.push({
        canonical: entry.canonical,
        subCuisine: entry.subCuisine,
        archetype: archetype as Archetype,
        required: target!.required,
        generateCount: gap,
        candidateDishes: target!.canonicalDishes,
      });
    }
  }
  // Required slots first, then alphabetical (canonical, archetype).
  return plan.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    if (a.canonical !== b.canonical) return a.canonical < b.canonical ? -1 : 1;
    return a.archetype < b.archetype ? -1 : 1;
  });
}

export interface GeneratedRecipe {
  title: string;
  canonicalCuisine: string;
  subCuisine: string | null;
  archetype: Archetype;
  embedding: number[] | null;
  qualityScore: number;
  /** Full recipe payload — deferred to caller-side typing. */
  payload: Record<string, unknown>;
}

export interface SeedRunDeps {
  /** Generate one recipe for the slot — production wires Claude / OpenAI. */
  generate: (
    slot: SeedSlotPlan,
    candidateDish: string,
  ) => Promise<GeneratedRecipe>;
  /** Catalog vectors for dedupe; pass [] until TB0 ships. */
  fetchCatalogEmbeddings: () => Promise<Array<{ recipeId: string; embedding: number[] }>>;
  /** Persist the recipe; production wires Prisma. */
  persist: (recipe: GeneratedRecipe) => Promise<void>;
}

export interface SeedRunOutcome {
  slot: SeedSlotPlan;
  candidateDish: string;
  status: 'committed' | 'rejected_low_quality' | 'rejected_duplicate' | 'failed';
  qualityScore: number | null;
  reason: string;
}

export interface SeedRunStats {
  totalSlots: number;
  totalAttempts: number;
  committed: number;
  rejectedLowQuality: number;
  rejectedDuplicate: number;
  failed: number;
}

export interface RunSeedBatchOptions {
  dryRun?: boolean;
  /** Cap total generations across the batch (cost gate). Default: unlimited. */
  maxGenerations?: number;
}

export interface SeedBatchResult {
  outcomes: SeedRunOutcome[];
  stats: SeedRunStats;
}

/**
 * Generate + validate + persist for each slot in the plan. Generations
 * cap at `maxGenerations` (cost gate). Each output must pass quality
 * ≥75 and dedupe (max cosine sim < DUPLICATE_SIM_THRESHOLD) to commit.
 * Honors dryRun.
 */
export async function runSeedBatch(
  plan: readonly SeedSlotPlan[],
  deps: SeedRunDeps,
  options: RunSeedBatchOptions = {},
): Promise<SeedBatchResult> {
  const stats: SeedRunStats = {
    totalSlots: plan.length,
    totalAttempts: 0,
    committed: 0,
    rejectedLowQuality: 0,
    rejectedDuplicate: 0,
    failed: 0,
  };
  const outcomes: SeedRunOutcome[] = [];
  const catalog = await deps.fetchCatalogEmbeddings();
  const cap = options.maxGenerations ?? Number.POSITIVE_INFINITY;

  for (const slot of plan) {
    for (let i = 0; i < slot.generateCount; i++) {
      if (stats.totalAttempts >= cap) break;
      const dish = slot.candidateDishes[i % slot.candidateDishes.length];
      stats.totalAttempts++;

      let recipe: GeneratedRecipe;
      try {
        recipe = await deps.generate(slot, dish);
      } catch (e) {
        stats.failed++;
        outcomes.push({
          slot,
          candidateDish: dish,
          status: 'failed',
          qualityScore: null,
          reason: `generate failed: ${(e as Error).message}`,
        });
        continue;
      }

      if (recipe.qualityScore < MIN_QUALITY_TO_COMMIT) {
        stats.rejectedLowQuality++;
        outcomes.push({
          slot,
          candidateDish: dish,
          status: 'rejected_low_quality',
          qualityScore: recipe.qualityScore,
          reason: `score ${recipe.qualityScore} < ${MIN_QUALITY_TO_COMMIT}`,
        });
        continue;
      }

      if (recipe.embedding && recipe.embedding.length > 0) {
        let bestSim = -Infinity;
        for (const peer of catalog) {
          const sim = cosineSimilarity(recipe.embedding, peer.embedding);
          if (sim > bestSim) bestSim = sim;
        }
        if (bestSim >= DUPLICATE_SIM_THRESHOLD) {
          stats.rejectedDuplicate++;
          outcomes.push({
            slot,
            candidateDish: dish,
            status: 'rejected_duplicate',
            qualityScore: recipe.qualityScore,
            reason: `duplicate of catalog (sim=${bestSim.toFixed(3)})`,
          });
          continue;
        }
      }

      if (!options.dryRun) {
        await deps.persist(recipe);
      }
      stats.committed++;
      outcomes.push({
        slot,
        candidateDish: dish,
        status: 'committed',
        qualityScore: recipe.qualityScore,
        reason: 'passed quality + dedupe',
      });
    }
    if (stats.totalAttempts >= cap) break;
  }

  return { outcomes, stats };
}

/** Convenience entrypoint that builds the plan from the full D9 list. */
export function buildSeedPlanFromDefaults(
  coverage: readonly SlotCoverage[],
): SeedSlotPlan[] {
  return buildSeedPlan(UNDERREPRESENTED, coverage);
}
