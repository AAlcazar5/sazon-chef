// ROADMAP 4.0 WK7.1 — applySkillTierConstraint test.

import {
  applySkillTierConstraint,
  tierFromKitchenIQ,
  __INTERNALS,
  type SkillTierCandidate,
} from '../../../src/services/recommender/skillTierConstraint';

const cand = (
  recipeId: string,
  score: number,
  difficulty: SkillTierCandidate['difficulty'],
): SkillTierCandidate => ({ recipeId, score, difficulty });

describe('WK7.1 — tierFromKitchenIQ', () => {
  it('< 3 → beginner', () => {
    expect(tierFromKitchenIQ(0)).toBe('beginner');
    expect(tierFromKitchenIQ(2.99)).toBe('beginner');
  });
  it('3 ≤ IQ < 7 → intermediate', () => {
    expect(tierFromKitchenIQ(3)).toBe('intermediate');
    expect(tierFromKitchenIQ(6.99)).toBe('intermediate');
  });
  it('≥ 7 → advanced', () => {
    expect(tierFromKitchenIQ(7)).toBe('advanced');
    expect(tierFromKitchenIQ(10)).toBe('advanced');
  });
});

describe('WK7.1 — applySkillTierConstraint', () => {
  it('beginner (KitchenIQ 2) yields ≥ 5/7 Easy slots', () => {
    // Each day has both Easy + Medium; greedy by score would pick Medium most days.
    const candidatesByDay = Array.from({ length: 7 }, (_, i) => [
      cand(`m${i}`, 0.95, 'Medium'),
      cand(`e${i}`, 0.85, 'Easy'),
    ]);
    const out = applySkillTierConstraint({
      candidatesByDay,
      kitchenIQ: 2,
    });
    expect(out.tier).toBe('beginner');
    expect(out.easyCount).toBeGreaterThanOrEqual(5);
    expect(out.meetsTarget).toBe(true);
  });

  it('advanced (KitchenIQ 8) yields ≥ 1 Hard slot when alternatives exist', () => {
    const candidatesByDay = Array.from({ length: 7 }, (_, i) => [
      cand(`e${i}`, 0.95, 'Easy'),
      cand(`m${i}`, 0.9, 'Medium'),
      cand(`h${i}`, 0.85, 'Hard'),
    ]);
    const out = applySkillTierConstraint({
      candidatesByDay,
      kitchenIQ: 8,
    });
    expect(out.tier).toBe('advanced');
    expect(out.hardCount).toBeGreaterThanOrEqual(1);
    expect(out.meetsTarget).toBe(true);
  });

  it('intermediate (KitchenIQ 5) targets 50% Easy', () => {
    const candidatesByDay = Array.from({ length: 6 }, (_, i) => [
      cand(`m${i}`, 0.95, 'Medium'),
      cand(`e${i}`, 0.85, 'Easy'),
    ]);
    const out = applySkillTierConstraint({
      candidatesByDay,
      kitchenIQ: 5,
    });
    expect(out.tier).toBe('intermediate');
    expect(out.easyCount).toBeGreaterThanOrEqual(3); // 50% of 6
  });

  it('manual override on a slot persists across constraint enforcement', () => {
    const candidatesByDay = Array.from({ length: 7 }, (_, i) => [
      cand(`m${i}`, 0.95, 'Medium'),
      cand(`e${i}`, 0.85, 'Easy'),
    ]);
    const out = applySkillTierConstraint({
      candidatesByDay,
      kitchenIQ: 2,
      manualOverrides: { 0: 'm0' }, // beginner pinned a Medium slot
    });
    expect(out.selections[0].recipeId).toBe('m0');
    expect(out.selections[0].pinned).toBe(true);
    expect(out.selections[0].difficulty).toBe('Medium');
    // Even with the pinned Medium, beginner should still hit ≥ 5 Easy
    // by swapping the OTHER 6 days.
    expect(out.easyCount).toBeGreaterThanOrEqual(5);
  });

  it('pinned slot survives even when its recipeId is not present in candidates', () => {
    // Edge: caller pins an id that's not in the candidate set; we fall back
    // gracefully to the top-score candidate (caller's job to validate).
    const candidatesByDay = [[cand('a', 0.9, 'Easy')]];
    const out = applySkillTierConstraint({
      candidatesByDay,
      kitchenIQ: 5,
      manualOverrides: { 0: 'doesnt-exist' },
    });
    expect(out.selections[0].recipeId).toBe('a');
    expect(out.selections[0].pinned).toBe(false);
  });

  it('no Easy alternatives → beginner returns plan with meetsTarget=false (does not crash)', () => {
    const candidatesByDay = Array.from({ length: 7 }, (_, i) => [
      cand(`m${i}`, 0.9, 'Medium'),
    ]);
    const out = applySkillTierConstraint({
      candidatesByDay,
      kitchenIQ: 1,
    });
    expect(out.easyCount).toBe(0);
    expect(out.meetsTarget).toBe(false);
    expect(out.selections).toHaveLength(7);
  });

  it('no Hard alternatives → advanced still returns a plan with meetsTarget=true (no Hard required)', () => {
    const candidatesByDay = Array.from({ length: 7 }, (_, i) => [
      cand(`e${i}`, 0.9, 'Easy'),
      cand(`m${i}`, 0.85, 'Medium'),
    ]);
    const out = applySkillTierConstraint({
      candidatesByDay,
      kitchenIQ: 8,
    });
    expect(out.hardCount).toBe(0);
    expect(out.meetsTarget).toBe(true); // No Hard exists — target is unreachable, treated as met
  });

  it('soft signal — does not over-displace high-score Mediums for low-score Easies', () => {
    // Beginner (KitchenIQ 1, 7 days, target ≥ 5 Easy):
    //   day 0..4: only Medium offered (m=0.9)
    //   day 5..6: Medium 0.95 + Easy 0.20 (huge score gap).
    //
    // Beginner needs 5 Easy slots, but only days 5+6 have Easy alts. After
    // swap, easyCount = 2 < 5 → meetsTarget=false, low-quality recipes not
    // forced into earlier slots. The "soft" property: we don't make the
    // plan worse; we report the gap.
    const candidatesByDay = [
      [cand('m0', 0.9, 'Medium')],
      [cand('m1', 0.9, 'Medium')],
      [cand('m2', 0.9, 'Medium')],
      [cand('m3', 0.9, 'Medium')],
      [cand('m4', 0.9, 'Medium')],
      [cand('m5', 0.95, 'Medium'), cand('e5', 0.20, 'Easy')],
      [cand('m6', 0.95, 'Medium'), cand('e6', 0.20, 'Easy')],
    ];
    const out = applySkillTierConstraint({
      candidatesByDay,
      kitchenIQ: 1,
    });
    expect(out.easyCount).toBe(2); // best we can do
    expect(out.meetsTarget).toBe(false);
    // First 5 days kept Medium (no Easy alternative existed there).
    expect(out.selections[0].difficulty).toBe('Medium');
  });

  it('does not mutate input candidates', () => {
    const candidatesByDay = [[cand('a', 0.9, 'Easy'), cand('b', 0.85, 'Medium')]];
    const before = JSON.stringify(candidatesByDay);
    applySkillTierConstraint({
      candidatesByDay,
      kitchenIQ: 5,
    });
    expect(JSON.stringify(candidatesByDay)).toBe(before);
  });

  it('empty candidates yields empty plan', () => {
    const out = applySkillTierConstraint({
      candidatesByDay: [],
      kitchenIQ: 5,
    });
    expect(out.selections).toEqual([]);
    expect(out.meetsTarget).toBe(true);
  });

  it('exposes target ratios for cap-test inspection', () => {
    expect(__INTERNALS.TARGET_EASY_RATIO.beginner).toBe(0.7);
    expect(__INTERNALS.TARGET_EASY_RATIO.intermediate).toBe(0.5);
    expect(__INTERNALS.TARGET_EASY_RATIO.advanced).toBe(0.33);
    expect(__INTERNALS.KITCHEN_IQ_BEGINNER_MAX).toBe(3);
    expect(__INTERNALS.KITCHEN_IQ_ADVANCED_MIN).toBe(7);
  });
});
