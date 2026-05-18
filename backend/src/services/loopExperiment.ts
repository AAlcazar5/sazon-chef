// backend/src/services/loopExperiment.ts
//
// W-A5a — dormant experiment-assignment primitive for the Phase-2 loop-value
// A/B (full design: plans/office-hours/wa5-phase2-beta-ab.md). Pure +
// deterministic. The hard invariant: when `active` is false it ALWAYS
// returns 'treatment' (the currently-shipped behaviour), so importing /
// shipping this changes nothing in production until a beta experiment is
// deliberately switched on. Not wired into the loop yet — that wire
// (control-arm suppression) is W-A5b, gated on Tier Q beta.

export type LoopArm = 'treatment' | 'control';

export interface LoopExperimentConfig {
  /** false → always 'treatment' (production unchanged). */
  active: boolean;
  /** Fraction routed to control when active. Default 0.5, clamped [0,1]. */
  controlFraction?: number;
  /** Experiment id / salt — re-salting repartitions users. */
  salt?: string;
}

// FNV-1a (32-bit) → stable, dependency-free, well-distributed. Deterministic
// across runtimes/processes so a user's arm never flips.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0; // unsigned
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * Deterministic, sticky per-user arm. Inactive ⇒ always 'treatment'.
 * Blank userId ⇒ 'treatment' (never bucket an anonymous request).
 */
export function resolveLoopExperimentArm(
  userId: string,
  config: LoopExperimentConfig,
): LoopArm {
  if (!config.active) return 'treatment';
  if (!userId || userId.trim() === '') return 'treatment';

  const fraction = clamp01(
    config.controlFraction === undefined ? 0.5 : config.controlFraction,
  );
  if (fraction <= 0) return 'treatment';
  if (fraction >= 1) return 'control';

  const bucket = fnv1a(`${config.salt ?? ''}:${userId}`) / 0x100000000; // [0,1)
  return bucket < fraction ? 'control' : 'treatment';
}
