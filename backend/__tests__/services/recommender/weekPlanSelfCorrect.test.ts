// ROADMAP 4.0 WK4.2 — selfCorrectBoringWeek test.

import {
  selfCorrectBoringWeek,
  __INTERNALS,
  type SelectedDayLite,
} from '../../../src/services/recommender/boringWeekSelfCorrector';
import type { CandidateForDay } from '../../../src/services/recommender/cuisineRotationConstraint';

// Adjacency map (Tier C-ish): cuisines in the same Mediterranean cluster.
const ADJACENCY: Record<string, string[]> = {
  italian: ['greek', 'lebanese', 'moroccan', 'spanish'],
  greek: ['italian', 'lebanese', 'turkish'],
  mexican: ['salvadorean', 'peruvian', 'colombian'],
  japanese: ['korean', 'vietnamese', 'thai'],
  thai: ['vietnamese', 'indonesian', 'japanese'],
};
const getAdjacent = (cuisine: string): string[] => ADJACENCY[cuisine] ?? [];

const sel = (recipeId: string, cuisine: string, score: number): SelectedDayLite => ({
  recipeId,
  cuisine,
  score,
});
const cand = (recipeId: string, cuisine: string, score: number): CandidateForDay => ({
  recipeId,
  cuisine,
  score,
});

// Boring-week predicate: cuisine appearing in ≥ MAX_PER_CUISINE days is boring.
function makeIsBoring(maxPerCuisine: number) {
  return (selections: SelectedDayLite[]) => {
    const counts = new Map<string, number>();
    for (const s of selections) {
      counts.set(s.cuisine, (counts.get(s.cuisine) ?? 0) + 1);
    }
    let worst: { cuisine: string; n: number } | null = null;
    for (const [cuisine, n] of counts) {
      if (n >= maxPerCuisine && (!worst || n > worst.n)) {
        worst = { cuisine, n };
      }
    }
    if (!worst) return { boring: false };
    return { boring: true, overRepresentedCuisine: worst.cuisine };
  };
}

describe('WK4.2 — selfCorrectBoringWeek', () => {
  it('5-Italian week → corrector swaps to ≤ 3 Italian meals', () => {
    const selections: SelectedDayLite[] = [
      sel('r1', 'italian', 0.9),
      sel('r2', 'mexican', 0.85),
      sel('r3', 'italian', 0.88),
      sel('r4', 'italian', 0.86),
      sel('r5', 'italian', 0.84),
      sel('r6', 'italian', 0.83),
      sel('r7', 'mexican', 0.8),
    ];
    const candidatesByDay: CandidateForDay[][] = [
      [cand('r1', 'italian', 0.9), cand('r1b', 'greek', 0.85)],
      [cand('r2', 'mexican', 0.85)],
      [cand('r3', 'italian', 0.88), cand('r3b', 'lebanese', 0.8)],
      [cand('r4', 'italian', 0.86), cand('r4b', 'moroccan', 0.82)],
      [cand('r5', 'italian', 0.84), cand('r5b', 'greek', 0.78)],
      [cand('r6', 'italian', 0.83), cand('r6b', 'spanish', 0.75)],
      [cand('r7', 'mexican', 0.8)],
    ];
    const out = selfCorrectBoringWeek({
      selections,
      candidatesByDay,
      isBoring: makeIsBoring(4), // ≥ 4 italian = boring
      getAdjacent,
    });
    const italianCount = out.selections.filter((s) => s.cuisine === 'italian').length;
    expect(italianCount).toBeLessThanOrEqual(3);
  });

  it('terminates at not-boring after the minimum needed swaps', () => {
    const selections: SelectedDayLite[] = [
      sel('r1', 'italian', 0.9),
      sel('r2', 'italian', 0.88),
      sel('r3', 'italian', 0.86),
      sel('r4', 'italian', 0.84),
      sel('r5', 'mexican', 0.8),
    ];
    const candidatesByDay: CandidateForDay[][] = [
      [cand('r1', 'italian', 0.9), cand('r1b', 'greek', 0.85)],
      [cand('r2', 'italian', 0.88), cand('r2b', 'lebanese', 0.82)],
      [cand('r3', 'italian', 0.86)],
      [cand('r4', 'italian', 0.84), cand('r4b', 'moroccan', 0.78)],
      [cand('r5', 'mexican', 0.8)],
    ];
    const out = selfCorrectBoringWeek({
      selections,
      candidatesByDay,
      isBoring: makeIsBoring(4),
      getAdjacent,
    });
    expect(out.terminatedReason).toBe('not-boring');
    expect(out.corrections.length).toBeGreaterThan(0);
    expect(out.corrections.length).toBeLessThanOrEqual(3);
  });

  it('caps at MAX_CORRECTIONS (3) and reports terminated reason', () => {
    // Construct a week that's "always boring" — the predicate never accepts.
    const selections: SelectedDayLite[] = [
      sel('r1', 'italian', 0.9),
      sel('r2', 'italian', 0.88),
      sel('r3', 'italian', 0.86),
      sel('r4', 'italian', 0.84),
      sel('r5', 'italian', 0.82),
      sel('r6', 'italian', 0.8),
      sel('r7', 'italian', 0.78),
    ];
    const candidatesByDay: CandidateForDay[][] = selections.map((s, i) => [
      cand(`alt${i}`, 'greek', 0.5),
      cand(s.recipeId, s.cuisine, s.score),
    ]);
    const alwaysBoring = (sels: SelectedDayLite[]) => ({
      boring: true,
      overRepresentedCuisine: 'italian',
    });
    const out = selfCorrectBoringWeek({
      selections,
      candidatesByDay,
      isBoring: alwaysBoring,
      getAdjacent,
    });
    expect(out.iterationsRun).toBe(3);
    expect(out.corrections).toHaveLength(3);
    expect(out.terminatedReason).toBe('max-corrections');
  });

  it('honors caller-supplied maxCorrections override', () => {
    const selections: SelectedDayLite[] = [
      sel('r1', 'italian', 0.9),
      sel('r2', 'italian', 0.88),
    ];
    const candidatesByDay: CandidateForDay[][] = [
      [cand('r1', 'italian', 0.9), cand('r1b', 'greek', 0.5)],
      [cand('r2', 'italian', 0.88), cand('r2b', 'lebanese', 0.5)],
    ];
    const out = selfCorrectBoringWeek({
      selections,
      candidatesByDay,
      isBoring: () => ({ boring: true, overRepresentedCuisine: 'italian' }),
      getAdjacent,
      maxCorrections: 1,
    });
    expect(out.iterationsRun).toBe(1);
    expect(out.corrections).toHaveLength(1);
  });

  it('not boring → no corrections, terminates immediately', () => {
    const selections: SelectedDayLite[] = [
      sel('r1', 'italian', 0.9),
      sel('r2', 'mexican', 0.85),
      sel('r3', 'thai', 0.8),
    ];
    const out = selfCorrectBoringWeek({
      selections,
      candidatesByDay: [],
      isBoring: () => ({ boring: false }),
      getAdjacent,
    });
    expect(out.corrections).toEqual([]);
    expect(out.terminatedReason).toBe('not-boring');
    expect(out.iterationsRun).toBe(0);
  });

  it('terminates with no-swap-available when no adjacent variant exists', () => {
    const selections: SelectedDayLite[] = [
      sel('r1', 'italian', 0.9),
      sel('r2', 'italian', 0.88),
    ];
    const candidatesByDay: CandidateForDay[][] = [
      [cand('r1', 'italian', 0.9)], // only italian available
      [cand('r2', 'italian', 0.88)],
    ];
    const out = selfCorrectBoringWeek({
      selections,
      candidatesByDay,
      isBoring: () => ({ boring: true, overRepresentedCuisine: 'italian' }),
      getAdjacent,
    });
    expect(out.terminatedReason).toBe('no-swap-available');
    expect(out.corrections).toEqual([]);
  });

  it('captures swap rationale on each correction (lifestyle voice)', () => {
    const selections: SelectedDayLite[] = [
      sel('r1', 'italian', 0.9),
      sel('r2', 'italian', 0.88),
    ];
    const candidatesByDay: CandidateForDay[][] = [
      [cand('r1', 'italian', 0.9), cand('r1b', 'greek', 0.85)],
      [cand('r2', 'italian', 0.88), cand('r2b', 'lebanese', 0.82)],
    ];
    const out = selfCorrectBoringWeek({
      selections,
      candidatesByDay,
      isBoring: makeIsBoring(2), // ≥ 2 same → boring
      getAdjacent,
    });
    expect(out.corrections.length).toBeGreaterThan(0);
    const r = out.corrections[0];
    expect(r.rationale).toMatch(/adjacent/i);
    expect(r.fromCuisine).toBe('italian');
    expect(r.toCuisine).not.toBe('italian');
    // Rationale must NOT contain banned vocabulary.
    expect(/under your goal|target|warning|error/i.test(r.rationale)).toBe(false);
  });

  it('does not introduce a consecutive-cuisine repeat via the swap', () => {
    const selections: SelectedDayLite[] = [
      sel('r1', 'italian', 0.9),
      sel('r2', 'italian', 0.88),
      sel('r3', 'greek', 0.84),
    ];
    // Day 2's only adjacent option is `greek` — but that would create
    // italian→greek→greek. The corrector should reject it.
    const candidatesByDay: CandidateForDay[][] = [
      [cand('r1', 'italian', 0.9)],
      [cand('r2', 'italian', 0.88), cand('r2b', 'greek', 0.7)],
      [cand('r3', 'greek', 0.84)],
    ];
    const out = selfCorrectBoringWeek({
      selections,
      candidatesByDay,
      isBoring: () => ({ boring: true, overRepresentedCuisine: 'italian' }),
      getAdjacent,
    });
    // No legal swap → no-swap-available.
    expect(out.terminatedReason).toBe('no-swap-available');
  });

  it('does not mutate input selections array', () => {
    const selections: SelectedDayLite[] = [
      sel('r1', 'italian', 0.9),
      sel('r2', 'italian', 0.88),
    ];
    const before = JSON.stringify(selections);
    selfCorrectBoringWeek({
      selections,
      candidatesByDay: [
        [cand('r1', 'italian', 0.9), cand('r1b', 'greek', 0.7)],
        [cand('r2', 'italian', 0.88)],
      ],
      isBoring: () => ({ boring: true, overRepresentedCuisine: 'italian' }),
      getAdjacent,
    });
    expect(JSON.stringify(selections)).toBe(before);
  });

  it('publishes MAX_CORRECTIONS for cap-test inspection', () => {
    expect(__INTERNALS.MAX_CORRECTIONS).toBe(3);
  });

  it('picks the highest-score adjacent alternative when multiple exist', () => {
    const selections: SelectedDayLite[] = [
      sel('r1', 'italian', 0.9),
      sel('r2', 'italian', 0.88),
    ];
    const candidatesByDay: CandidateForDay[][] = [
      [cand('r1', 'italian', 0.9)],
      [
        cand('r2', 'italian', 0.88),
        cand('r2-low', 'greek', 0.6),
        cand('r2-high', 'lebanese', 0.85), // best alt
        cand('r2-mid', 'moroccan', 0.7),
      ],
    ];
    const out = selfCorrectBoringWeek({
      selections,
      candidatesByDay,
      isBoring: makeIsBoring(2),
      getAdjacent,
    });
    expect(out.corrections[0].toCuisine).toBe('lebanese');
  });
});
