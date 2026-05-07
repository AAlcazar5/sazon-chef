// ROADMAP 4.0 WK2.1 — leftoverContinuityPlanner test.

import {
  planLeftoverContinuity,
  __INTERNALS,
  type CandidateRecipe,
  type OpenSlot,
} from '../../src/services/recommender/leftoverContinuityPlanner';

const SUNDAY = '2026-05-10';
const MONDAY_LUNCH: OpenSlot = { date: '2026-05-11', kind: 'lunch' };
const MONDAY_DINNER: OpenSlot = { date: '2026-05-11', kind: 'dinner' };
const TUESDAY_LUNCH: OpenSlot = { date: '2026-05-12', kind: 'lunch' };
const TUESDAY_DINNER: OpenSlot = { date: '2026-05-12', kind: 'dinner' };
const WEDNESDAY_LUNCH: OpenSlot = { date: '2026-05-13', kind: 'lunch' };

const CHILI: CandidateRecipe = {
  recipeId: 'chili-1',
  scalesLinearly: true,
  servings: 4,
};
const SUSHI: CandidateRecipe = {
  recipeId: 'sushi-1',
  scalesLinearly: false,
  servings: 2,
};

describe('WK2.1 — planLeftoverContinuity', () => {
  it('schedules cook-on-Sunday + eat-on-Mon/Tue for a 4-portion linearly-scaling chili', () => {
    const plan = planLeftoverContinuity({
      candidate: CHILI,
      cookOnDay: SUNDAY,
      openSlots: [MONDAY_LUNCH, TUESDAY_LUNCH],
      userAcceptanceRate: 0.8,
    });
    expect(plan).not.toBeNull();
    expect(plan!.recipeId).toBe('chili-1');
    expect(plan!.cookOnDay).toBe(SUNDAY);
    expect(plan!.eatOnDays).toEqual(['2026-05-11', '2026-05-12']);
    expect(plan!.portions).toBe(2);
  });

  it('returns null for a sushi recipe (does not scale)', () => {
    const plan = planLeftoverContinuity({
      candidate: SUSHI,
      cookOnDay: SUNDAY,
      openSlots: [MONDAY_LUNCH, TUESDAY_LUNCH],
      userAcceptanceRate: 0.9,
    });
    expect(plan).toBeNull();
  });

  it('returns null when user leftover-acceptance rate is below 0.3', () => {
    const plan = planLeftoverContinuity({
      candidate: CHILI,
      cookOnDay: SUNDAY,
      openSlots: [MONDAY_LUNCH, TUESDAY_LUNCH],
      userAcceptanceRate: 0.2,
    });
    expect(plan).toBeNull();
  });

  it('returns null when there are no open lunch/dinner slots in the next 2 days', () => {
    const plan = planLeftoverContinuity({
      candidate: CHILI,
      cookOnDay: SUNDAY,
      openSlots: [],
      userAcceptanceRate: 0.8,
    });
    expect(plan).toBeNull();
  });

  it('only considers lunch + dinner slots (skips breakfast)', () => {
    const plan = planLeftoverContinuity({
      candidate: CHILI,
      cookOnDay: SUNDAY,
      openSlots: [
        { date: '2026-05-11', kind: 'breakfast' },
        { date: '2026-05-11', kind: 'lunch' },
      ],
      userAcceptanceRate: 0.8,
    });
    expect(plan).not.toBeNull();
    expect(plan!.eatOnDays).toEqual(['2026-05-11']);
    expect(plan!.portions).toBe(1);
  });

  it('only considers slots within the next MAX_DAYS_FORWARD (2) days — Wednesday is too far', () => {
    const plan = planLeftoverContinuity({
      candidate: CHILI,
      cookOnDay: SUNDAY,
      openSlots: [WEDNESDAY_LUNCH], // 3 days out — out of window
      userAcceptanceRate: 0.8,
    });
    expect(plan).toBeNull();
  });

  it('skips the cook day itself (delta must be > 0)', () => {
    const plan = planLeftoverContinuity({
      candidate: CHILI,
      cookOnDay: SUNDAY,
      openSlots: [{ date: SUNDAY, kind: 'dinner' }, MONDAY_LUNCH],
      userAcceptanceRate: 0.8,
    });
    expect(plan).not.toBeNull();
    expect(plan!.eatOnDays).toEqual(['2026-05-11']);
  });

  it('caps schedule at availableLeftovers (servings - 1 reserved for cook)', () => {
    // 4 servings, 1 reserved → 3 leftover meals. Provide 5 slots; only 3 should be picked.
    const plan = planLeftoverContinuity({
      candidate: { ...CHILI, servings: 4 },
      cookOnDay: SUNDAY,
      openSlots: [
        MONDAY_LUNCH,
        MONDAY_DINNER,
        TUESDAY_LUNCH,
        TUESDAY_DINNER,
      ],
      userAcceptanceRate: 0.8,
    });
    expect(plan).not.toBeNull();
    expect(plan!.eatOnDays).toHaveLength(3);
    expect(plan!.portions).toBe(3);
  });

  it('returns null when servings == 1 (no leftovers after cook)', () => {
    const plan = planLeftoverContinuity({
      candidate: { ...CHILI, servings: 1 },
      cookOnDay: SUNDAY,
      openSlots: [MONDAY_LUNCH, TUESDAY_LUNCH],
      userAcceptanceRate: 0.8,
    });
    expect(plan).toBeNull();
  });

  it('returns null when servings == 0', () => {
    const plan = planLeftoverContinuity({
      candidate: { ...CHILI, servings: 0 },
      cookOnDay: SUNDAY,
      openSlots: [MONDAY_LUNCH, TUESDAY_LUNCH],
      userAcceptanceRate: 0.8,
    });
    expect(plan).toBeNull();
  });

  it('prefers earlier days first (Mon over Tue when only 1 leftover meal)', () => {
    const plan = planLeftoverContinuity({
      candidate: { ...CHILI, servings: 2 },
      cookOnDay: SUNDAY,
      openSlots: [TUESDAY_LUNCH, MONDAY_LUNCH],
      userAcceptanceRate: 0.8,
    });
    expect(plan).not.toBeNull();
    expect(plan!.eatOnDays).toEqual(['2026-05-11']);
  });

  it('exactly at the acceptance floor (0.3) → carry-over allowed', () => {
    const plan = planLeftoverContinuity({
      candidate: CHILI,
      cookOnDay: SUNDAY,
      openSlots: [MONDAY_LUNCH],
      userAcceptanceRate: 0.3,
    });
    expect(plan).not.toBeNull();
  });

  it('does not mutate the openSlots input', () => {
    const slots = [TUESDAY_LUNCH, MONDAY_LUNCH];
    const before = [...slots];
    planLeftoverContinuity({
      candidate: CHILI,
      cookOnDay: SUNDAY,
      openSlots: slots,
      userAcceptanceRate: 0.8,
    });
    expect(slots).toEqual(before);
  });

  it('publishes constants for cap-test inspection', () => {
    expect(__INTERNALS.ACCEPTANCE_FLOOR).toBe(0.3);
    expect(__INTERNALS.MAX_DAYS_FORWARD).toBe(2);
    expect(__INTERNALS.PORTIONS_PER_LEFTOVER_MEAL).toBe(1);
  });
});
