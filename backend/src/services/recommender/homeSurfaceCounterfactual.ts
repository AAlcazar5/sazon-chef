// backend/src/services/recommender/homeSurfaceCounterfactual.ts
// ROADMAP 4.0 HX1.5 — counterfactual A/B analyzer for home-screen surfaces.
//
// Given a session log of (surfaceId, shown, tappedFollow), compute per-
// surface tap-through across the test window. Surfaces are tagged
// `retire: true` when their tap-through is below threshold over a
// minimum-sample window.
//
// Pure function — does NOT read the DB. Caller (route or cron) gathers
// the session events and hands them in. Lets us unit-test the decision
// logic against fixture inputs without standing up the prod query.
//
// Voice guard: the report's prose framing must NOT contain trainer-coded
// vocabulary ("underperforming", "failing"). Surfaces are *retired* when
// they don't earn their slot — neutral, not punitive.

export interface SurfaceImpression {
  /** Stable surface id, e.g. 'StretchHomeCard', 'PlateOfWeekCard'. */
  surfaceId: string;
  /** Whether the surface was shown this session (counterfactual half). */
  shown: boolean;
  /** Whether the user tapped through to the recipe / target after seeing it. */
  tapped: boolean;
}

export interface SurfaceTapThrough {
  surfaceId: string;
  shownCount: number;
  tappedCount: number;
  /** tappedCount / shownCount — undefined when shownCount=0. */
  rate: number | null;
  /** True when rate < threshold AND shownCount ≥ minSample. */
  retire: boolean;
  /** Neutral one-line summary, lifestyle voice. */
  summary: string;
}

export interface CounterfactualReportInputs {
  impressions: ReadonlyArray<SurfaceImpression>;
  /** Tap-through rate below which the surface is tagged for retirement. */
  threshold: number;
  /**
   * Minimum shown count required to make a retire decision. Smaller
   * samples leave the surface alone — `retire: false` and the summary
   * notes "not enough data."
   */
  minSample: number;
}

export interface CounterfactualReport {
  perSurface: SurfaceTapThrough[];
  /** Surfaces that crossed the retire threshold. */
  retireList: string[];
  /** Total impressions inspected. */
  totalImpressions: number;
}

function summarize(
  surfaceId: string,
  shownCount: number,
  rate: number | null,
  enoughData: boolean,
  retire: boolean
): string {
  if (!enoughData) {
    return `${surfaceId}: ${shownCount} impressions — not enough data yet.`;
  }
  const pct = ((rate ?? 0) * 100).toFixed(1);
  if (retire) {
    return `${surfaceId}: ${pct}% tap-through — earning its slot less than the recipe grid below; retire candidate.`;
  }
  return `${surfaceId}: ${pct}% tap-through — earning its slot.`;
}

export function buildCounterfactualReport(
  inputs: CounterfactualReportInputs
): CounterfactualReport {
  const buckets = new Map<string, { shown: number; tapped: number }>();
  for (const imp of inputs.impressions) {
    if (!imp.shown) continue; // counterfactual hide-half doesn't contribute
    const b = buckets.get(imp.surfaceId) ?? { shown: 0, tapped: 0 };
    b.shown += 1;
    if (imp.tapped) b.tapped += 1;
    buckets.set(imp.surfaceId, b);
  }

  const perSurface: SurfaceTapThrough[] = [];
  for (const [surfaceId, b] of [...buckets.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const rate = b.shown > 0 ? b.tapped / b.shown : null;
    const enoughData = b.shown >= inputs.minSample;
    const retire = enoughData && rate !== null && rate < inputs.threshold;
    perSurface.push({
      surfaceId,
      shownCount: b.shown,
      tappedCount: b.tapped,
      rate,
      retire,
      summary: summarize(surfaceId, b.shown, rate, enoughData, retire),
    });
  }

  const retireList = perSurface.filter((s) => s.retire).map((s) => s.surfaceId);
  return {
    perSurface,
    retireList,
    totalImpressions: inputs.impressions.length,
  };
}
