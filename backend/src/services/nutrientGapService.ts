// backend/src/services/nutrientGapService.ts
// Group 10X Phase 9 — daily nutrient gap detection.
//
// Tracks rolling intake for fiber, omega-3, vitamin D, iron, magnesium.
// Identifies the user's biggest gap and ranks components that fill it.

export const TARGET_DAILY_NUTRIENTS = {
  fiberG: 28,
  omega3G: 1.6,
  vitaminDIu: 600,
  ironMg: 18,
  magnesiumMg: 400,
} as const;

export type TrackedNutrient = keyof typeof TARGET_DAILY_NUTRIENTS;

export interface NutrientIntake {
  fiberG?: number;
  omega3G?: number;
  vitaminDIu?: number;
  ironMg?: number;
  magnesiumMg?: number;
}

export interface NutrientGapResult {
  pctRemainingByNutrient: Record<TrackedNutrient, number>;
  topGap: TrackedNutrient | null;
}

export const computeNutrientGap = (intake: NutrientIntake): NutrientGapResult => {
  const nutrients: TrackedNutrient[] = ['fiberG', 'omega3G', 'vitaminDIu', 'ironMg', 'magnesiumMg'];
  const pct = {} as Record<TrackedNutrient, number>;
  let topGap: TrackedNutrient | null = null;
  let topPct = 0;

  for (const n of nutrients) {
    const target = TARGET_DAILY_NUTRIENTS[n];
    const got = intake[n] ?? 0;
    const remaining = Math.max(0, target - got);
    const remainingPct = remaining / target;
    pct[n] = remainingPct;
    if (remainingPct > topPct) {
      topPct = remainingPct;
      topGap = n;
    }
  }

  return { pctRemainingByNutrient: pct, topGap };
};

export const rankComponentsForGap = <T extends Partial<Record<TrackedNutrient, number>> & { id: string }>(
  components: T[],
  topGap: TrackedNutrient | null
): T[] => {
  if (!topGap) return components;
  return [...components].sort((a, b) => (b[topGap] ?? 0) - (a[topGap] ?? 0));
};
