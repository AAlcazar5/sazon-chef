// frontend/lib/forceUpgrade.ts
// ROADMAP 4.0 U3 — Force-upgrade gate (pure helpers).
//
// Holds the semver compare + evaluateUpgrade pure functions used by the
// `useForceUpgrade` hook. Kept pure (no expo-constants, no fetch) so unit
// tests can exercise edge cases without mocking native modules.

export type Platform = 'ios' | 'android';

export interface MinVersionFloor {
  ios: string;
  android: string;
}

export interface EvaluateInput {
  build: string;
  platform: Platform;
  floor: MinVersionFloor | null;
}

export interface EvaluateResult {
  mustUpgrade: boolean;
  floor: string | null;
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;

interface Parsed {
  parts: [number, number, number];
  pre: string | null;
}

function parse(v: string): Parsed | null {
  const m = v.match(SEMVER);
  if (!m) return null;
  return {
    parts: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] ?? null,
  };
}

/**
 * Compare two semver strings. Returns negative if a < b, zero if equal,
 * positive if a > b. Malformed inputs are treated as "less than valid",
 * so a garbage build version compared against a real floor returns -1
 * (which would lock users out) — to prevent that, the hook gates the
 * mustUpgrade decision on a successful parse of *both* sides.
 */
export function compareSemver(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa && !pb) return 0;
  if (!pa) return -1;
  if (!pb) return 1;
  for (let i = 0; i < 3; i++) {
    if (pa.parts[i] !== pb.parts[i]) return pa.parts[i] - pb.parts[i];
  }
  // Pre-release is "less than" stable per semver §11.
  if (pa.pre === pb.pre) return 0;
  if (pa.pre && !pb.pre) return -1;
  if (!pa.pre && pb.pre) return 1;
  return (pa.pre as string).localeCompare(pb.pre as string);
}

/**
 * Decide whether the current build must upgrade. Returns mustUpgrade=false
 * for any of:
 *   - floor payload missing / API unreachable
 *   - either side fails to parse (defensive: a bad build string must not
 *     brick the app on launch)
 */
export function evaluateUpgrade(input: EvaluateInput): EvaluateResult {
  if (!input.floor) return { mustUpgrade: false, floor: null };
  const platformFloor = input.floor[input.platform];
  if (!platformFloor) return { mustUpgrade: false, floor: null };
  // Require both sides to parse before locking users out.
  if (!parse(input.build) || !parse(platformFloor)) {
    return { mustUpgrade: false, floor: platformFloor };
  }
  return {
    mustUpgrade: compareSemver(input.build, platformFloor) < 0,
    floor: platformFloor,
  };
}
