// W-A5a — dormant experiment-assignment primitive. The ONLY thing built
// now; everything else in W-A5 is design (gated on Tier Q beta). The
// non-negotiable invariant: when the experiment is inactive it must behave
// EXACTLY like today (always 'treatment' — the shipped loop), so this ships
// with zero production behavior change.

import { resolveLoopExperimentArm } from '../../src/services/loopExperiment';

describe('resolveLoopExperimentArm — inactive = production unchanged', () => {
  it('always returns treatment when the experiment is inactive', () => {
    for (const u of ['u1', 'u2', 'whoever', '', '   ']) {
      expect(
        resolveLoopExperimentArm(u, { active: false }),
      ).toBe('treatment');
      expect(
        resolveLoopExperimentArm(u, { active: false, controlFraction: 1 }),
      ).toBe('treatment'); // even controlFraction=1 cannot divert when inactive
    }
  });
});

describe('resolveLoopExperimentArm — active assignment', () => {
  const cfg = { active: true, controlFraction: 0.5, salt: 'loop-v1' };

  it('is stable per user (same user → same arm, every call)', () => {
    for (const u of ['alice', 'bob', 'carol', 'user_12345']) {
      const first = resolveLoopExperimentArm(u, cfg);
      for (let i = 0; i < 25; i += 1) {
        expect(resolveLoopExperimentArm(u, cfg)).toBe(first);
      }
    }
  });

  it('splits ~50/50 over many users (within tolerance)', () => {
    let control = 0;
    const N = 4000;
    for (let i = 0; i < N; i += 1) {
      if (resolveLoopExperimentArm(`beta_user_${i}`, cfg) === 'control') control += 1;
    }
    expect(control / N).toBeGreaterThan(0.45);
    expect(control / N).toBeLessThan(0.55);
  });

  it('controlFraction 0 → all treatment; 1 → all control (when active)', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(
        resolveLoopExperimentArm(`u${i}`, { active: true, controlFraction: 0 }),
      ).toBe('treatment');
      expect(
        resolveLoopExperimentArm(`u${i}`, { active: true, controlFraction: 1 }),
      ).toBe('control');
    }
  });

  it('does not bucket an empty/blank userId (anon → treatment)', () => {
    expect(resolveLoopExperimentArm('', cfg)).toBe('treatment');
    expect(resolveLoopExperimentArm('   ', cfg)).toBe('treatment');
  });

  it('defaults controlFraction to 0.5 and clamps out-of-range', () => {
    const a = resolveLoopExperimentArm('x', { active: true, salt: 's' });
    expect(['treatment', 'control']).toContain(a);
    // clamp: negative → 0 (all treatment), >1 → 1 (all control)
    expect(resolveLoopExperimentArm('x', { active: true, controlFraction: -2 })).toBe('treatment');
    expect(resolveLoopExperimentArm('x', { active: true, controlFraction: 9 })).toBe('control');
  });

  it('salt changes the partition (different experiment id repartitions)', () => {
    const a = Array.from({ length: 300 }, (_, i) =>
      resolveLoopExperimentArm(`u${i}`, { active: true, salt: 'A' }),
    );
    const b = Array.from({ length: 300 }, (_, i) =>
      resolveLoopExperimentArm(`u${i}`, { active: true, salt: 'B' }),
    );
    expect(a).not.toEqual(b); // re-salting must reshuffle, not mirror
  });
});
