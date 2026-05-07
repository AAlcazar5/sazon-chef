// ROADMAP 4.0 WK4.1 — selectWeekWithRotation test.

import {
  selectWeekWithRotation,
  __INTERNALS,
  type CandidateForDay,
} from '../../../src/services/recommender/cuisineRotationConstraint';

// A simple fixture cluster map for the test:
//   - italian, greek, lebanese, moroccan       → mediterranean
//   - japanese, korean, vietnamese             → eastasian
//   - mexican, salvadorean, peruvian            → latam
//   - indian, thai                             → southasian
const CLUSTER_MAP: Record<string, string> = {
  italian: 'mediterranean',
  greek: 'mediterranean',
  lebanese: 'mediterranean',
  moroccan: 'mediterranean',
  japanese: 'eastasian',
  korean: 'eastasian',
  vietnamese: 'eastasian',
  mexican: 'latam',
  salvadorean: 'latam',
  peruvian: 'latam',
  indian: 'southasian',
  thai: 'southasian',
};
const clusterFor = (cuisine: string): string | null => CLUSTER_MAP[cuisine] ?? null;

const cand = (
  recipeId: string,
  cuisine: string,
  score: number,
): CandidateForDay => ({ recipeId, cuisine, score });

describe('WK4.1 — selectWeekWithRotation', () => {
  it('returns one selection per day', () => {
    const days: CandidateForDay[][] = [
      [cand('r1', 'italian', 0.9), cand('r2', 'greek', 0.85)],
      [cand('r3', 'japanese', 0.92), cand('r4', 'mexican', 0.7)],
      [cand('r5', 'mexican', 0.88), cand('r6', 'italian', 0.7)],
    ];
    const out = selectWeekWithRotation({ days, clusterFor });
    expect(out.selections).toHaveLength(3);
  });

  it('produces 0 consecutive-cuisine repeats when alternatives exist', () => {
    // Day 1 best is italian; Day 2 best is also italian — must pick day 2's
    // second-best (greek) since rule rejects italian → italian.
    const days: CandidateForDay[][] = [
      [cand('r1', 'italian', 0.95), cand('r2', 'greek', 0.7)],
      [cand('r3', 'italian', 0.9), cand('r4', 'greek', 0.85)],
      [cand('r5', 'italian', 0.8), cand('r6', 'mexican', 0.6)],
    ];
    const out = selectWeekWithRotation({ days, clusterFor });
    for (let i = 1; i < out.selections.length; i++) {
      expect(out.selections[i].cuisine).not.toBe(out.selections[i - 1].cuisine);
    }
    expect(out.hasConsecutiveRepeat).toBe(false);
  });

  it('falls back to top-score (with consecutiveRepeat=true) when no alternative exists', () => {
    const days: CandidateForDay[][] = [
      [cand('r1', 'italian', 0.95)],
      [cand('r2', 'italian', 0.9)], // no other choice
      [cand('r3', 'mexican', 0.7)],
    ];
    const out = selectWeekWithRotation({ days, clusterFor });
    expect(out.selections[1].cuisine).toBe('italian');
    expect(out.selections[1].consecutiveRepeat).toBe(true);
    expect(out.hasConsecutiveRepeat).toBe(true);
  });

  it('respects recentCuisines on day 1 — rejects same as last recent', () => {
    const days: CandidateForDay[][] = [
      [cand('r1', 'italian', 0.95), cand('r2', 'mexican', 0.7)],
      [cand('r3', 'mexican', 0.85)],
    ];
    const out = selectWeekWithRotation({
      days,
      clusterFor,
      recentCuisines: ['italian'], // last cooked was italian — day 1 should not repeat
    });
    expect(out.selections[0].cuisine).toBe('mexican');
  });

  it('reaches ≥ minDistinctClusters by swapping a same-cluster pick for an unused cluster', () => {
    // Greedy alone would pick 7 mediterranean cuisines (italian/greek/italian/greek...).
    // Each day has a moderately-scored alternative from a different cluster.
    const days: CandidateForDay[][] = [
      [cand('a1', 'italian', 0.95), cand('a2', 'japanese', 0.85)],
      [cand('b1', 'greek', 0.9), cand('b2', 'mexican', 0.85)],
      [cand('c1', 'italian', 0.93), cand('c2', 'thai', 0.8)],
      [cand('d1', 'greek', 0.92), cand('d2', 'vietnamese', 0.85)],
      [cand('e1', 'italian', 0.91), cand('e2', 'peruvian', 0.85)],
      [cand('f1', 'greek', 0.9), cand('f2', 'korean', 0.82)],
      [cand('g1', 'lebanese', 0.88), cand('g2', 'indian', 0.7)],
    ];
    const out = selectWeekWithRotation({
      days,
      clusterFor,
      minDistinctClusters: 3,
    });
    expect(out.distinctClusters).toBeGreaterThanOrEqual(3);
    expect(out.meetsClusterFloor).toBe(true);
  });

  it('honors a higher minDistinctClusters floor when alternatives exist', () => {
    const days: CandidateForDay[][] = [
      [cand('a1', 'italian', 0.95), cand('a2', 'japanese', 0.9)],
      [cand('b1', 'greek', 0.9), cand('b2', 'mexican', 0.88)],
      [cand('c1', 'italian', 0.85), cand('c2', 'thai', 0.84)],
      [cand('d1', 'greek', 0.85), cand('d2', 'vietnamese', 0.8)],
    ];
    const out = selectWeekWithRotation({
      days,
      clusterFor,
      minDistinctClusters: 4,
    });
    expect(out.distinctClusters).toBeGreaterThanOrEqual(4);
  });

  it('does not crash when no alternatives exist to meet cluster floor', () => {
    // Only mediterranean cuisines available — cluster floor cannot be met.
    const days: CandidateForDay[][] = [
      [cand('a1', 'italian', 0.9)],
      [cand('b1', 'greek', 0.85)],
      [cand('c1', 'lebanese', 0.8)],
    ];
    const out = selectWeekWithRotation({
      days,
      clusterFor,
      minDistinctClusters: 3,
    });
    expect(out.distinctClusters).toBe(1);
    expect(out.meetsClusterFloor).toBe(false);
    // But still returns a valid plan with no consecutive repeats.
    expect(out.hasConsecutiveRepeat).toBe(false);
  });

  it('handles unmapped cuisines (clusterFor returns null) without crashing', () => {
    const days: CandidateForDay[][] = [
      [cand('a1', 'martian', 0.9)], // unknown cluster
      [cand('b1', 'italian', 0.85)],
    ];
    const out = selectWeekWithRotation({
      days,
      clusterFor,
    });
    expect(out.selections[0].cluster).toBeNull();
    expect(out.distinctClusters).toBe(1); // only italian counted
  });

  it('skips days with empty candidate sets', () => {
    const days: CandidateForDay[][] = [
      [cand('a1', 'italian', 0.9)],
      [], // empty
      [cand('c1', 'mexican', 0.85)],
    ];
    const out = selectWeekWithRotation({ days, clusterFor });
    expect(out.selections).toHaveLength(2);
  });

  it('returns empty selections when all days are empty', () => {
    const out = selectWeekWithRotation({
      days: [[], []],
      clusterFor,
    });
    expect(out.selections).toEqual([]);
    expect(out.distinctClusters).toBe(0);
    expect(out.hasConsecutiveRepeat).toBe(false);
  });

  it('does not mutate the input days arrays', () => {
    const days: CandidateForDay[][] = [
      [cand('a1', 'italian', 0.9), cand('a2', 'greek', 0.7)],
      [cand('b1', 'italian', 0.8), cand('b2', 'mexican', 0.85)],
    ];
    const before = JSON.stringify(days);
    selectWeekWithRotation({ days, clusterFor });
    expect(JSON.stringify(days)).toBe(before);
  });

  it('publishes default min-distinct-clusters constant for cap inspection', () => {
    expect(__INTERNALS.DEFAULT_MIN_DISTINCT_CLUSTERS).toBe(3);
  });
});
