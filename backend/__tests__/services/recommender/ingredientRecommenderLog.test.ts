// ROADMAP 4.0 IG9.1 — Ingredient surface logging test.

import { prisma } from '../../../src/lib/prisma';
import {
  logIngredientEvent,
  __resetDedupCacheForTests,
  __DEDUP_WINDOW_MS,
} from '../../../src/services/recommender/ingredientRecommenderLog';

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
  __resetDedupCacheForTests();
});

const NOW = new Date('2026-05-06T12:00:00Z');

describe('IG9.1 — logIngredientEvent', () => {
  it('persists an ingredient_recommend event with the correct shape', async () => {
    const id = await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: 'cilantro',
      source: 'cadence',
      position: 1,
    });
    expect(id).toBe('evt-1');
    const data = eventCreate.mock.calls[0][0].data;
    const snap = JSON.parse(data.contextSnapshot);
    expect(snap.surface).toBe('ingredient_recommend');
    expect(snap.eventType).toBe('tap');
    expect(snap.metadata.suggestedItem).toBe('cilantro');
    expect(snap.metadata.source).toBe('cadence');
    expect(snap.metadata.position).toBe(1);
  });

  it('persists co_purchase + pantry_iq surfaces too', async () => {
    await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_co_purchase',
      eventType: 'impression',
      suggestedItem: 'lime',
      source: 'co_purchase',
    });
    await logIngredientEvent({
      userId: 'u1',
      surface: 'pantry_iq',
      eventType: 'tap',
      suggestedItem: 'chickpeas',
      source: 'cultural',
    });
    expect(eventCreate).toHaveBeenCalledTimes(2);
    const surfaces = eventCreate.mock.calls.map(
      (c) => JSON.parse(c[0].data.contextSnapshot).surface,
    );
    expect(surfaces).toEqual(['ingredient_co_purchase', 'pantry_iq']);
  });

  it('returns null on empty userId without persisting', async () => {
    const id = await logIngredientEvent({
      userId: '',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: 'cilantro',
      source: 'cadence',
    });
    expect(id).toBeNull();
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it('returns null on empty suggestedItem without persisting', async () => {
    const id = await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: '',
      source: 'cadence',
    });
    expect(id).toBeNull();
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it('drops a duplicate event within the 60s dedup window', async () => {
    const a = await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: 'cilantro',
      source: 'cadence',
      asOf: NOW,
    });
    const b = await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: 'cilantro',
      source: 'cadence',
      asOf: NOW, // same instant
    });
    expect(a).toBe('evt-1');
    expect(b).toBeNull();
    expect(eventCreate).toHaveBeenCalledTimes(1);
  });

  it('does NOT dedup events on different surfaces', async () => {
    const t = NOW;
    await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: 'cilantro',
      source: 'cadence',
      asOf: t,
    });
    await logIngredientEvent({
      userId: 'u1',
      surface: 'pantry_iq',
      eventType: 'tap',
      suggestedItem: 'cilantro',
      source: 'cadence',
      asOf: t,
    });
    expect(eventCreate).toHaveBeenCalledTimes(2);
  });

  it('does NOT dedup events on different items', async () => {
    const t = NOW;
    await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: 'cilantro',
      source: 'cadence',
      asOf: t,
    });
    await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: 'lime',
      source: 'cadence',
      asOf: t,
    });
    expect(eventCreate).toHaveBeenCalledTimes(2);
  });

  it('does NOT dedup events on different event types', async () => {
    const t = NOW;
    await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'impression',
      suggestedItem: 'cilantro',
      source: 'cadence',
      asOf: t,
    });
    await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: 'cilantro',
      source: 'cadence',
      asOf: t,
    });
    expect(eventCreate).toHaveBeenCalledTimes(2);
  });

  it('PII guard inherits from the unified writer (free-text metadata stripped)', async () => {
    await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: 'cilantro',
      source: 'cadence',
      metadata: {
        anchorIngredient: 'lime',
        searchQuery: 'pii-leak-attempt',
        note: 'pii',
      },
    });
    const snap = JSON.parse(eventCreate.mock.calls[0][0].data.contextSnapshot);
    expect(snap.metadata.anchorIngredient).toBe('lime');
    expect(snap.metadata.searchQuery).toBeUndefined();
    expect(snap.metadata.note).toBeUndefined();
  });

  it('publishes the 60s dedup window for inspection', () => {
    expect(__DEDUP_WINDOW_MS).toBe(60_000);
  });

  it('case-insensitive item match for dedup (so "Cilantro" + "cilantro" dedup)', async () => {
    await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: 'Cilantro',
      source: 'cadence',
      asOf: NOW,
    });
    const b = await logIngredientEvent({
      userId: 'u1',
      surface: 'ingredient_recommend',
      eventType: 'tap',
      suggestedItem: 'cilantro',
      source: 'cadence',
      asOf: NOW,
    });
    expect(b).toBeNull();
    expect(eventCreate).toHaveBeenCalledTimes(1);
  });
});
