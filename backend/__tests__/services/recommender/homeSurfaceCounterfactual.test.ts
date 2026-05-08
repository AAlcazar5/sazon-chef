// HX1.5 — counterfactual A/B analyzer tests.
//
// Pure function — given fixture session impressions, compute per-surface
// tap-through and retire-candidate list.

import {
  buildCounterfactualReport,
  type SurfaceImpression,
} from '../../../src/services/recommender/homeSurfaceCounterfactual';

function impressions(
  spec: Record<string, { shown: number; tapped: number }>
): SurfaceImpression[] {
  const out: SurfaceImpression[] = [];
  for (const [surfaceId, { shown, tapped }] of Object.entries(spec)) {
    for (let i = 0; i < shown; i += 1) {
      out.push({ surfaceId, shown: true, tapped: i < tapped });
    }
  }
  return out;
}

describe('buildCounterfactualReport', () => {
  it('flags surfaces below the threshold as retire candidates', () => {
    // 100 impressions; 1 tap = 1% tap-through, below 2% threshold
    const fix = impressions({
      StretchHomeCard: { shown: 100, tapped: 1 },
    });
    const report = buildCounterfactualReport({
      impressions: fix,
      threshold: 0.02,
      minSample: 50,
    });
    expect(report.retireList).toEqual(['StretchHomeCard']);
    const row = report.perSurface[0];
    expect(row.shownCount).toBe(100);
    expect(row.tappedCount).toBe(1);
    expect(row.rate).toBeCloseTo(0.01);
    expect(row.retire).toBe(true);
  });

  it('keeps surfaces that meet or exceed the threshold', () => {
    const fix = impressions({
      PlateOfWeekCard: { shown: 100, tapped: 5 },
    });
    const report = buildCounterfactualReport({
      impressions: fix,
      threshold: 0.02,
      minSample: 50,
    });
    expect(report.retireList).toEqual([]);
    expect(report.perSurface[0].rate).toBeCloseTo(0.05);
    expect(report.perSurface[0].retire).toBe(false);
  });

  it('does NOT retire when sample size is below minSample', () => {
    // Only 10 shown, 0 tapped — but minSample is 50, so verdict deferred
    const fix = impressions({
      SmallSampleCard: { shown: 10, tapped: 0 },
    });
    const report = buildCounterfactualReport({
      impressions: fix,
      threshold: 0.02,
      minSample: 50,
    });
    expect(report.retireList).toEqual([]);
    expect(report.perSurface[0].retire).toBe(false);
    expect(report.perSurface[0].summary).toMatch(/not enough data/i);
  });

  it('ignores hide-half impressions (shown=false)', () => {
    const fix: SurfaceImpression[] = [
      ...impressions({ StretchHomeCard: { shown: 50, tapped: 5 } }),
      // 50 hide-half (counterfactual) entries — must NOT count
      ...Array.from({ length: 50 }, () => ({
        surfaceId: 'StretchHomeCard',
        shown: false,
        tapped: false,
      })),
    ];
    const report = buildCounterfactualReport({
      impressions: fix,
      threshold: 0.02,
      minSample: 30,
    });
    expect(report.perSurface[0].shownCount).toBe(50); // not 100
  });

  it('emits one row per distinct surfaceId, sorted alphabetically', () => {
    const fix = impressions({
      PlateOfWeekCard: { shown: 60, tapped: 3 },
      StretchHomeCard: { shown: 60, tapped: 0 },
      AskSazonCard: { shown: 60, tapped: 6 },
    });
    const report = buildCounterfactualReport({
      impressions: fix,
      threshold: 0.02,
      minSample: 50,
    });
    expect(report.perSurface.map((s) => s.surfaceId)).toEqual([
      'AskSazonCard',
      'PlateOfWeekCard',
      'StretchHomeCard',
    ]);
  });

  it('reports total impressions including the hide-half', () => {
    const fix: SurfaceImpression[] = [
      ...impressions({ X: { shown: 5, tapped: 0 } }),
      ...Array.from({ length: 7 }, () => ({
        surfaceId: 'X',
        shown: false,
        tapped: false,
      })),
    ];
    const report = buildCounterfactualReport({
      impressions: fix,
      threshold: 0.02,
      minSample: 1,
    });
    expect(report.totalImpressions).toBe(12);
  });

  it('voice guard: summary does NOT use trainer-coded vocabulary', () => {
    const fix = impressions({
      StretchHomeCard: { shown: 100, tapped: 1 }, // retire candidate
      PlateOfWeekCard: { shown: 100, tapped: 5 }, // earning
    });
    const report = buildCounterfactualReport({
      impressions: fix,
      threshold: 0.02,
      minSample: 50,
    });
    const allText = report.perSurface.map((s) => s.summary).join(' ').toLowerCase();
    for (const banned of ['underperforming', 'failing', 'underperformer', 'loser']) {
      expect(allText).not.toMatch(new RegExp(`\\b${banned}\\b`));
    }
  });

  it('handles empty input cleanly (no throw, empty report)', () => {
    const report = buildCounterfactualReport({
      impressions: [],
      threshold: 0.02,
      minSample: 50,
    });
    expect(report.perSurface).toEqual([]);
    expect(report.retireList).toEqual([]);
    expect(report.totalImpressions).toBe(0);
  });
});
