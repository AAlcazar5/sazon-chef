// W-A3 (TEST ONLY — drives future implementation; office-hours gate: the
// loop must be proven before wiring it into recommendations).
//
// W-A3's job: translate a captured CookEvent into the EXISTING affinity
// vocabulary so the Cook Log feeds slot affinity WITHOUT touching the
// scoring-adjacent delta map. The characterization guarantee is structural:
// `cookEventToAffinityEvent` must return one of slotAffinityService's
// existing `AffinityEvent` shapes (or null) — it may NOT invent new deltas.
// Pure function, no prisma, so this test is robust and unambiguous.
//
// RED until W-A3 ships. `cookEventToAffinity` does not exist yet — that is
// intentional (the test is the spec).

import type { AffinityEvent } from '../../src/services/slotAffinityService';
// eslint-disable-next-line @typescript-eslint/no-var-requires
let mapFn: ((e: {
  type: string;
  userId: string;
  recipeId: string | null;
  payload: Record<string, unknown>;
}) => AffinityEvent | null) | undefined;
try {
  // Lazy require so the suite collects even before the module exists.
  mapFn = require('../../src/services/cookEventAffinity').cookEventToAffinityEvent;
} catch {
  mapFn = undefined;
}

const VALID_AFFINITY_TYPES = [
  'plate_saved',
  'plate_cooked',
  'plate_rated',
  'swap_away',
];

describe('W-A3 — cookEventToAffinityEvent (spec; RED until implemented)', () => {
  it('module exists and exports cookEventToAffinityEvent', () => {
    expect(typeof mapFn).toBe('function');
  });

  it('a made_it CookEvent maps to a plate_cooked affinity event for the same user', () => {
    const out = mapFn!({
      type: 'made_it',
      userId: 'u1',
      recipeId: 'r1',
      payload: { componentIds: ['c1', 'c2'] },
    });
    expect(out).not.toBeNull();
    expect(out!.type).toBe('plate_cooked');
    expect(out!.userId).toBe('u1');
  });

  it('only ever emits an EXISTING affinity type (cannot invent new deltas)', () => {
    for (const type of ['made_it', 'scale', 'swap', 'note', 'outcome']) {
      const out = mapFn!({ type, userId: 'u1', recipeId: 'r1', payload: {} });
      if (out !== null) expect(VALID_AFFINITY_TYPES).toContain(out.type);
    }
  });

  it('a note/outcome CookEvent with no signal maps to null (no-op, not a fake delta)', () => {
    expect(mapFn!({ type: 'note', userId: 'u1', recipeId: null, payload: {} })).toBeNull();
  });

  it('a swap CookEvent maps to swap_away on the swapped-out component', () => {
    const out = mapFn!({
      type: 'swap',
      userId: 'u1',
      recipeId: 'r1',
      payload: { swappedOutComponentId: 'cX' },
    });
    expect(out).not.toBeNull();
    expect(out!.type).toBe('swap_away');
  });
});
