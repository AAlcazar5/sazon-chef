// backend/scripts/loopBacktest.ts
//
// W-A4 — Phase-1 loop-value backtest (offline, deterministic, no DB/users).
// Proves the MECHANISM: does feeding CookEvents through the real affinity
// math measurably surface a persona's held-out cooks higher than a
// no-personalization baseline? It does NOT prove humans value it — that is
// Phase 2 (beta A/B). See plans/office-hours/loop-value-measurement.md.
//
// Faithful by construction: uses the production cookEventToAffinityEvent
// mapper and the production deltaForEvent/clamp (guarded by
// slotAffinity.deltaCharacterization.test.ts). The only reimplemented bit is
// the per-component accumulation + getTopComponentsForSlot ranking contract
// (sampleCount >= 3, score desc, top-N), which is contract-tested.

import { cookEventToAffinityEvent } from '../src/services/cookEventAffinity';
import { deltaForEvent, clamp } from '../src/services/slotAffinityService';

export interface Persona {
  id: string;
  slot: string;
  /** Latent-preferred components (cooked repeatedly, then held out). */
  preferred: string[];
  /** Distractors that share the slot but the persona doesn't favor. */
  distractors: string[];
  /** Ordered cooks; each is the set of componentIds cooked together. */
  cooks: string[][];
}

export interface BacktestThresholds {
  topN: number;
  trainCooks: number; // k: first-k fed; cooks[k..] held out
  minPersonaPassRate: number; // fraction of personas where ON > OFF
  minMeanLift: number; // mean(onHitRate - offHitRate) across personas
}

interface Acc {
  score: number;
  sampleCount: number;
}

const SAMPLE_FLOOR = 3; // mirrors getTopComponentsForSlot's sampleCount >= 3

/**
 * Replay cooks as `made_it` CookEvents through the REAL mapper + REAL delta
 * math, accumulating per-component score exactly like recordSlotAffinity
 * (clamp(prev + delta), sampleCount++). Returns the affinity table.
 */
export function replayAffinity(
  userId: string,
  cooks: string[][],
): Map<string, Acc> {
  const table = new Map<string, Acc>();
  for (const cook of cooks) {
    const evt = cookEventToAffinityEvent({
      type: 'made_it',
      userId,
      recipeId: null,
      payload: { componentIds: cook },
    });
    if (!evt) continue;
    const delta = deltaForEvent(evt);
    if (delta === null) continue;
    const ids = 'componentIds' in evt ? evt.componentIds : [];
    for (const id of ids) {
      const prev = table.get(id) ?? { score: 0, sampleCount: 0 };
      table.set(id, {
        score: clamp(prev.score + delta),
        sampleCount: prev.sampleCount + 1,
      });
    }
  }
  return table;
}

/** Faithful getTopComponentsForSlot: sampleCount >= 3, score desc, top-N.
 *  Deterministic tiebreak by componentId so runs are reproducible. */
export function rankTopN(table: Map<string, Acc>, n: number): string[] {
  return [...table.entries()]
    .filter(([, a]) => a.sampleCount >= SAMPLE_FLOOR)
    .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([id]) => id);
}

export interface PersonaResult {
  id: string;
  onHitRate: number;
  offHitRate: number;
  lift: number;
  pass: boolean;
}

export interface BacktestResult {
  perPersona: PersonaResult[];
  passRate: number;
  meanLift: number;
  verdict: { pass: boolean; reason: string };
}

function hitRate(heldOut: string[][], ranked: string[]): number {
  if (heldOut.length === 0) return 0;
  const top = new Set(ranked);
  const hits = heldOut.filter((cook) => cook.some((c) => top.has(c))).length;
  return hits / heldOut.length;
}

/**
 * Leave-one-out: feed first `trainCooks`, hold out the rest. ON = affinity
 * ranking; OFF = no-personalization baseline (candidate pool in a fixed,
 * non-preferential order — what the user would see with no learning).
 */
export function backtestPersona(
  p: Persona,
  t: BacktestThresholds,
): PersonaResult {
  const train = p.cooks.slice(0, t.trainCooks);
  const heldOut = p.cooks.slice(t.trainCooks);

  const on = rankTopN(replayAffinity(p.id, train), t.topN);

  // OFF baseline: no signal → stable, non-preferential ordering of the
  // slot's candidate pool (preferred ∪ distractors), sorted by id. This is
  // exactly what ON degrades to when the loop adds nothing.
  const off = [...p.preferred, ...p.distractors]
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .slice(0, t.topN);

  const onHitRate = hitRate(heldOut, on);
  const offHitRate = hitRate(heldOut, off);
  return {
    id: p.id,
    onHitRate,
    offHitRate,
    lift: onHitRate - offHitRate,
    pass: onHitRate > offHitRate,
  };
}

export function runBacktest(
  personas: Persona[],
  t: BacktestThresholds,
): BacktestResult {
  const perPersona = personas.map((p) => backtestPersona(p, t));
  const passRate =
    perPersona.length === 0
      ? 0
      : perPersona.filter((r) => r.pass).length / perPersona.length;
  const meanLift =
    perPersona.length === 0
      ? 0
      : perPersona.reduce((s, r) => s + r.lift, 0) / perPersona.length;

  const pass =
    passRate >= t.minPersonaPassRate && meanLift >= t.minMeanLift;
  const reason = pass
    ? `PASS — passRate ${passRate.toFixed(2)} ≥ ${t.minPersonaPassRate}, meanLift ${meanLift.toFixed(3)} ≥ ${t.minMeanLift}`
    : `FAIL — passRate ${passRate.toFixed(2)} (need ${t.minPersonaPassRate}), meanLift ${meanLift.toFixed(3)} (need ${t.minMeanLift}). Route to S fallback per loop-value-measurement.md decision table.`;
  return { perPersona, passRate, meanLift, verdict: { pass, reason } };
}

/**
 * Deterministic synthetic personas (no RNG). Each has a distinct preferred
 * triple, repeated cooks (so trained components clear the sampleCount floor),
 * and shared distractors. Held-out cooks draw from the same preferred set —
 * a working loop should surface them; a dead loop won't.
 */
export function synthesizePersonas(count = 10): Persona[] {
  // 20 distractors, id-sorted BEFORE preferred ("d_##" < "p#_x"), so the
  // no-personalization OFF baseline (pool sorted by id, top-N) buries the
  // preferred set — exactly what "no learning" looks like. A working loop
  // (ON) must rank the cooked-preferred components back into the top-N.
  const distractors = Array.from({ length: 20 }, (_, j) =>
    `d_${String(j).padStart(2, '0')}`,
  );
  const personas: Persona[] = [];
  for (let i = 0; i < count; i += 1) {
    const pref = [`p${i}_a`, `p${i}_b`, `p${i}_c`];
    // 6 cooks of the preferred set (train clears sampleCount>=3), then 3
    // held-out cooks of the same preference.
    const cooks: string[][] = [];
    for (let k = 0; k < 6; k += 1) cooks.push([pref[k % 3], pref[(k + 1) % 3]]);
    for (let k = 0; k < 3; k += 1) cooks.push([pref[k % 3]]);
    personas.push({
      id: `persona_${i}`,
      slot: 'main',
      preferred: pref,
      distractors,
      cooks,
    });
  }
  return personas;
}
