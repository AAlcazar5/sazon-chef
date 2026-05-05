// backend/src/services/experimentFramework.ts
// ROADMAP 4.0 Tier B4 — Algorithmic A/B framework.
//
// Variant key for scoring/ranking calls. Deterministic per (experimentId,
// userId) so a user always lands in the same bucket. Results read from the
// B3 SurfaceYieldSnapshot pipeline so experiments share the same metric
// definitions as the rest of telemetry.
//
// CRITICAL: variants live in scoring/ranking ONLY — never in UI components.
// UI experiments fragment the experience; algorithm experiments sharpen it.

import { prisma } from '../lib/prisma';
import type { Surface } from './surfaceYieldService';

interface ExperimentDef {
  id: string;
  variants: string[];
  /** Optional — required if you call getExperimentResults for this experiment. */
  surface?: Surface | string;
}

const EXPERIMENT_REGISTRY: Map<string, ExperimentDef> = new Map();

export function registerExperiment(def: ExperimentDef): void {
  if (def.variants.length < 2) {
    throw new Error(
      `registerExperiment(${def.id}): need at least 2 variants, got ${def.variants.length}`
    );
  }
  const seen = new Set<string>();
  for (const v of def.variants) {
    if (seen.has(v)) {
      throw new Error(`registerExperiment(${def.id}): duplicate variant "${v}"`);
    }
    seen.add(v);
  }
  EXPERIMENT_REGISTRY.set(def.id, { ...def });
}

export function resetExperimentRegistryForTesting(): void {
  EXPERIMENT_REGISTRY.clear();
}

/**
 * Stable string hash. djb2-derived; fast and gives a reasonable spread
 * across short inputs without bringing in a crypto dependency.
 */
function hashStringToInt(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    // (hash * 33) XOR char — chained to stay within signed 32-bit
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get the variant assignment for a user on an experiment.
 * Same `(experimentId, userId)` always returns the same variant.
 */
export function getVariant(experimentId: string, userId: string): string {
  const def = EXPERIMENT_REGISTRY.get(experimentId);
  if (!def) {
    throw new Error(`getVariant: experiment "${experimentId}" not registered`);
  }
  const bucket = hashStringToInt(`${experimentId}:${userId}`) % def.variants.length;
  return def.variants[bucket];
}

export interface VariantResult {
  variant: string;
  impressions: number;
  taps: number;
  cooks: number;
  rates: number;
  signalYield: number;
}

export interface ExperimentResult {
  experimentId: string;
  surface: string;
  asOfDate: Date;
  variants: VariantResult[];
  /** Variant with the highest signal yield — null when only one variant has data. */
  winner: string | null;
}

/**
 * Read per-variant yield from B3 SurfaceYieldSnapshot. Same metric pipeline
 * as the rest of telemetry — experiments don't get their own ground truth.
 */
export async function getExperimentResults(opts: {
  experimentId: string;
  asOfDate: Date;
  /** Optional — defaults to comparing the same asOfDate row only. */
  windowDays?: number;
}): Promise<ExperimentResult> {
  const def = EXPERIMENT_REGISTRY.get(opts.experimentId);
  if (!def) {
    throw new Error(`getExperimentResults: experiment "${opts.experimentId}" not registered`);
  }
  if (!def.surface) {
    throw new Error(
      `getExperimentResults: experiment "${opts.experimentId}" has no surface — cannot read yields`
    );
  }

  const windowDays = opts.windowDays ?? 0;
  const since = new Date(opts.asOfDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const where: Record<string, unknown> = {
    surface: def.surface,
    asOfDate: windowDays > 0 ? { gte: since, lte: opts.asOfDate } : opts.asOfDate,
    variant: { in: def.variants },
  };

  const rows = (await (prisma as any).surfaceYieldSnapshot.findMany({
    where,
  })) as Array<{
    surface: string;
    asOfDate: Date;
    variant: string;
    impressions: number;
    taps: number;
    cooks: number;
    rates: number;
    signalYield: number;
  }>;

  // Aggregate per variant (sum impressions/taps/cooks/rates; recompute yield).
  const aggregated: Map<string, VariantResult> = new Map();
  for (const v of def.variants) {
    aggregated.set(v, {
      variant: v,
      impressions: 0,
      taps: 0,
      cooks: 0,
      rates: 0,
      signalYield: 0,
    });
  }
  for (const row of rows) {
    const acc = aggregated.get(row.variant);
    if (!acc) continue;
    acc.impressions += row.impressions;
    acc.taps += row.taps;
    acc.cooks += row.cooks;
    acc.rates += row.rates;
  }
  for (const acc of aggregated.values()) {
    acc.signalYield =
      acc.impressions > 0 ? (acc.cooks + acc.rates) / acc.impressions : 0;
  }

  const variantResults = [...aggregated.values()];
  const variantsWithData = variantResults.filter((v) => v.impressions > 0);
  let winner: string | null = null;
  if (variantsWithData.length >= 2) {
    winner = variantsWithData.reduce((best, cur) =>
      cur.signalYield > best.signalYield ? cur : best
    ).variant;
  }

  return {
    experimentId: opts.experimentId,
    surface: String(def.surface),
    asOfDate: opts.asOfDate,
    variants: variantResults,
    winner,
  };
}
