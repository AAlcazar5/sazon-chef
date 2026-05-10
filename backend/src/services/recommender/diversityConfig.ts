// backend/src/services/recommender/diversityConfig.ts
// Tier TB6.4 — per-surface diversity tuning.
//
// MMR (TB6.1) takes `lambda` and `k`. Different home-screen surfaces want
// different relevance↔diversity tradeoffs:
//
//   home-feed       λ=0.7, k=2  — balanced; the default
//   more-like-this  λ=0.9, k=1  — relevance-dominant; users opted into a topic
//   recipe-sections λ=0.5, k=3  — diversity-dominant; sections are pre-topic-clustered
//
// Each value is ENV-overridable so we can A/B without redeploying.
// `simThreshold` reuses dedupeScorer's DUPLICATE_SIM_THRESHOLD by default.

import { DUPLICATE_SIM_THRESHOLD } from '../dedupeScorer';

export type DiversitySurface =
  | 'home-feed'
  | 'more-like-this'
  | 'recipe-sections'
  | 'default';

export interface DiversityConfig {
  lambda: number;
  k: number;
  simThreshold: number;
}

const SURFACE_DEFAULTS: Record<DiversitySurface, DiversityConfig> = {
  'home-feed': { lambda: 0.7, k: 2, simThreshold: DUPLICATE_SIM_THRESHOLD },
  'more-like-this': { lambda: 0.9, k: 1, simThreshold: DUPLICATE_SIM_THRESHOLD },
  'recipe-sections': { lambda: 0.5, k: 3, simThreshold: DUPLICATE_SIM_THRESHOLD },
  default: { lambda: 0.7, k: 2, simThreshold: DUPLICATE_SIM_THRESHOLD },
};

const ENV_KEY = (surface: DiversitySurface, field: 'LAMBDA' | 'K' | 'SIM_THRESHOLD') => {
  const slug = surface.replace(/-/g, '_').toUpperCase();
  return `DIVERSITY_${slug}_${field}`;
};

function readNumber(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function readInt(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (raw === undefined || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

/**
 * Resolve `{ lambda, k, simThreshold }` for a given surface, applying any
 * matching ENV overrides. Reads ENV at call time so tests can mutate
 * `process.env` between assertions without re-importing.
 */
export function getDiversityConfig(surface: DiversitySurface): DiversityConfig {
  const defaults = SURFACE_DEFAULTS[surface] ?? SURFACE_DEFAULTS.default;
  return {
    lambda: readNumber(ENV_KEY(surface, 'LAMBDA'), defaults.lambda),
    k: readInt(ENV_KEY(surface, 'K'), defaults.k),
    simThreshold: readNumber(ENV_KEY(surface, 'SIM_THRESHOLD'), defaults.simThreshold),
  };
}

export const DIVERSITY_SURFACE_DEFAULTS: Readonly<Record<DiversitySurface, DiversityConfig>> =
  SURFACE_DEFAULTS;
