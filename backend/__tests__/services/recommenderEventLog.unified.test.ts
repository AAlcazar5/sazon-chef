// ROADMAP 4.0 N1.1 — unified-table integration: events from every surface
// family land in the single `recommenderEvent` table; rollup queries can
// join across surfaces without crossing tables.
//
// This test pins the contract: future writers (RD7.1, IG, WK, build-a-plate)
// MUST write through the unified writer or use the same shape so Tier M
// synthesis becomes one query, not seven.

import { prisma } from '../../src/lib/prisma';
import { recordRecommenderEvent } from '../../src/services/recommender/recommenderEventSchema';

const eventCreate = jest.fn();
(prisma as any).recommenderEvent = {
  ...((prisma as any).recommenderEvent ?? {}),
  create: eventCreate,
};

beforeEach(() => {
  eventCreate.mockReset();
  let counter = 0;
  eventCreate.mockImplementation(() => {
    counter += 1;
    return Promise.resolve({ id: `evt-${counter}` });
  });
});

describe('N1.1 — events from all surface families share one table', () => {
  it('writes today / week / ingredient / home / filter / recipe-detail / build-a-plate events to the same model', async () => {
    const surfaces = [
      'today_hero',
      'week_slot',
      'pantry_iq',
      'home_today_hero',
      'filter_zero_result',
      'recipe_detail_similar',
      'recipe_detail_variant',
      'recipe_detail_bridge',
      'build_a_plate_slot',
    ] as const;

    for (const surface of surfaces) {
      const id = await recordRecommenderEvent({
        userId: 'u1',
        surface,
        eventType: surface === 'filter_zero_result' ? 'zero_result_filter_combo' : 'impression',
      });
      expect(id).not.toBeNull();
    }

    expect(eventCreate).toHaveBeenCalledTimes(surfaces.length);
    // Same prisma model — assertion that a single create was called per surface,
    // and the mock IS prisma.recommenderEvent (not a sibling table).
    for (const call of eventCreate.mock.calls) {
      expect(call[0]).toHaveProperty('data.userId');
      expect(call[0]).toHaveProperty('data.contextSnapshot');
    }
  });

  it('per-surface filtering: contextSnapshot.surface preserved as the discriminator', async () => {
    await recordRecommenderEvent({
      userId: 'u1',
      surface: 'recipe_detail_similar',
      eventType: 'tap',
      pickedRecipeId: 'r-target',
    });
    await recordRecommenderEvent({
      userId: 'u1',
      surface: 'today_hero',
      eventType: 'impression',
    });
    const calls = eventCreate.mock.calls;
    const surfaces = calls.map((c) => JSON.parse(c[0].data.contextSnapshot).surface);
    expect(surfaces).toEqual(['recipe_detail_similar', 'today_hero']);
  });

  it('RD7.1 outcome attribution rides on the same table via retrievalCallId', async () => {
    // Impression
    await recordRecommenderEvent({
      userId: 'u1',
      surface: 'recipe_detail_similar',
      eventType: 'impression',
      retrievalCallId: 'rcl-shared',
    });
    // Outcome 24h later
    await recordRecommenderEvent({
      userId: 'u1',
      surface: 'recipe_detail_similar',
      eventType: 'outcome_cooked_within_24h',
      retrievalCallId: 'rcl-shared',
      pickedRecipeId: 'r-cooked',
    });

    const snaps = eventCreate.mock.calls.map((c) =>
      JSON.parse(c[0].data.contextSnapshot),
    );
    expect(snaps[0].retrievalCallId).toBe('rcl-shared');
    expect(snaps[1].retrievalCallId).toBe('rcl-shared');
    expect(snaps[1].eventType).toBe('outcome_cooked_within_24h');
  });

  it('per-surface PII guards still fire (no free-text leakage)', async () => {
    await recordRecommenderEvent({
      userId: 'u1',
      surface: 'filter_zero_result',
      eventType: 'zero_result_filter_combo',
      metadata: {
        filters: { quick: true, vegetarian: false },
        cravingQuery: 'pii-leak-attempt',
        searchQuery: 'pii-leak-attempt-2',
      },
    });
    const snap = JSON.parse(eventCreate.mock.calls[0][0].data.contextSnapshot);
    expect(snap.metadata.cravingQuery).toBeUndefined();
    expect(snap.metadata.searchQuery).toBeUndefined();
    expect((snap.metadata.filters as any).quick).toBe(true);
  });
});
