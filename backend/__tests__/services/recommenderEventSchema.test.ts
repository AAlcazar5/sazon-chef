// ROADMAP 4.0 N1.1 + N1.3 — unified telemetry contract test.

import { prisma } from '../../src/lib/prisma';
import {
  validateEvent,
  recordRecommenderEvent,
  buildContextSnapshot,
  isKnownSurface,
  RECOMMENDER_SURFACES,
  TELEMETRY_CONTRACT,
} from '../../src/services/recommender/recommenderEventSchema';

const eventCreate = jest.fn();
(prisma as any).recommenderEvent = {
  ...((prisma as any).recommenderEvent ?? {}),
  create: eventCreate,
};

beforeEach(() => {
  eventCreate.mockReset();
  eventCreate.mockResolvedValue({ id: 'evt-unified' });
});

describe('N1.1 — surface enum', () => {
  it('lists every supported surface family', () => {
    // Sanity floor: at least one surface from each family on the audit
    const families = [
      'today_hero',
      'week_slot',
      'build_a_plate_slot',
      'pantry_iq',
      'filter_zero_result',
      'recipe_detail_similar',
      'sazon_chat',
      'activation',
    ];
    for (const f of families) {
      expect(RECOMMENDER_SURFACES).toContain(f);
    }
  });

  it('isKnownSurface returns true for canonical entries and false for typos', () => {
    expect(isKnownSurface('today_hero')).toBe(true);
    expect(isKnownSurface('recipe_detail_similar')).toBe(true);
    expect(isKnownSurface('not_a_surface')).toBe(false);
    expect(isKnownSurface('Today_Hero')).toBe(false); // case-sensitive
  });
});

describe('N1.3 — validateEvent', () => {
  it('passes a minimal valid payload', () => {
    const r = validateEvent({
      userId: 'u1',
      surface: 'today_hero',
      eventType: 'impression',
    });
    expect(r.ok).toBe(true);
    expect(r.cleaned!.userId).toBe('u1');
  });

  it('rejects unknown surfaces', () => {
    const r = validateEvent({
      userId: 'u1',
      surface: 'mystery_surface',
      eventType: 'impression',
    });
    expect(r.ok).toBe(false);
    expect(r.errors!.join(' ')).toMatch(/unknown surface/i);
  });

  it('rejects empty userId', () => {
    const r = validateEvent({
      userId: '',
      surface: 'today_hero',
      eventType: 'impression',
    });
    expect(r.ok).toBe(false);
  });

  it('strips free-text PII keys from metadata', () => {
    const r = validateEvent({
      userId: 'u1',
      surface: 'today_hero',
      eventType: 'impression',
      metadata: {
        recipeId: 'r-42',
        search: 'sneaky-pii',
        cravingQuery: 'pii-2',
        note: 'nope',
        position: 3,
      },
    });
    expect(r.ok).toBe(true);
    const meta = r.cleaned!.metadata!;
    expect(meta.recipeId).toBe('r-42');
    expect(meta.position).toBe(3);
    expect(meta.search).toBeUndefined();
    expect(meta.cravingQuery).toBeUndefined();
    expect(meta.note).toBeUndefined();
  });

  it('caps metadata at maxMetadataKeys', () => {
    const big: Record<string, unknown> = {};
    for (let i = 0; i < 50; i += 1) big[`k${i}`] = i;
    const r = validateEvent({
      userId: 'u1',
      surface: 'today_hero',
      eventType: 'impression',
      metadata: big,
    });
    expect(r.ok).toBe(true);
    const keptKeys = Object.keys(r.cleaned!.metadata!);
    expect(keptKeys.length).toBe(TELEMETRY_CONTRACT.maxMetadataKeys);
  });

  it('rejects confidence outside [0,1]', () => {
    expect(
      validateEvent({
        userId: 'u1',
        surface: 'today_hero',
        eventType: 'impression',
        confidence: 1.5,
      }).ok,
    ).toBe(false);
    expect(
      validateEvent({
        userId: 'u1',
        surface: 'today_hero',
        eventType: 'impression',
        confidence: -0.1,
      }).ok,
    ).toBe(false);
  });

  it('rejects negative position', () => {
    const r = validateEvent({
      userId: 'u1',
      surface: 'today_hero',
      eventType: 'impression',
      position: -1,
    });
    expect(r.ok).toBe(false);
  });

  it('caps copyLine at 280 chars', () => {
    const long = 'a'.repeat(300);
    const r = validateEvent({
      userId: 'u1',
      surface: 'today_hero',
      eventType: 'impression',
      copyLine: long,
    });
    expect(r.ok).toBe(false);
  });
});

describe('N1.1 — buildContextSnapshot', () => {
  it('includes surface + eventType + sanitized metadata', () => {
    const snap = buildContextSnapshot({
      userId: 'u1',
      surface: 'recipe_detail_similar',
      eventType: 'tap',
      metadata: { recipeId: 'r-7', anchorId: 'r-1' },
      position: 2,
      retrievalCallId: 'rcl-1',
    });
    expect(snap.surface).toBe('recipe_detail_similar');
    expect(snap.eventType).toBe('tap');
    expect((snap.metadata as any).recipeId).toBe('r-7');
    expect(snap.position).toBe(2);
    expect(snap.retrievalCallId).toBe('rcl-1');
  });

  it('omits optional fields when not provided', () => {
    const snap = buildContextSnapshot({
      userId: 'u1',
      surface: 'today_hero',
      eventType: 'impression',
    });
    expect(snap.position).toBeUndefined();
    expect(snap.metadata).toBeUndefined();
    expect(snap.retrievalCallId).toBeUndefined();
  });
});

describe('N1.1 — recordRecommenderEvent (integrated write)', () => {
  it('persists a valid event and returns its id', async () => {
    const id = await recordRecommenderEvent({
      userId: 'u1',
      surface: 'recipe_detail_similar',
      eventType: 'tap',
      pickedRecipeId: 'r-target',
      metadata: { anchor: 'r-anchor', position: 1 },
      confidence: 0.7,
      copyLine: 'More like this',
      source: 'rule_based',
    });
    expect(id).toBe('evt-unified');
    expect(eventCreate).toHaveBeenCalledTimes(1);
    const data = eventCreate.mock.calls[0][0].data;
    expect(data.userId).toBe('u1');
    const snap = JSON.parse(data.contextSnapshot);
    expect(snap.surface).toBe('recipe_detail_similar');
    expect(snap.eventType).toBe('tap');
    expect(snap.metadata.anchor).toBe('r-anchor');
  });

  it('returns null on validation failure (no persist)', async () => {
    const id = await recordRecommenderEvent({
      userId: '',
      surface: 'today_hero',
      eventType: 'impression',
    });
    expect(id).toBeNull();
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it('returns null on prisma failure but does not throw', async () => {
    eventCreate.mockRejectedValueOnce(new Error('db down'));
    const id = await recordRecommenderEvent({
      userId: 'u1',
      surface: 'today_hero',
      eventType: 'impression',
    });
    expect(id).toBeNull();
  });

  it('strips PII metadata before persisting', async () => {
    await recordRecommenderEvent({
      userId: 'u1',
      surface: 'filter_zero_result',
      eventType: 'zero_result_filter_combo',
      metadata: { filters: { quick: true }, search: 'pii-leak' },
    });
    const snap = JSON.parse(eventCreate.mock.calls[0][0].data.contextSnapshot);
    expect(snap.metadata.search).toBeUndefined();
    expect((snap.metadata.filters as any).quick).toBe(true);
  });
});

describe('N1.3 — telemetry contract constants', () => {
  it('publishes 100% sampling, 90d TTL, metadata cap', () => {
    expect(TELEMETRY_CONTRACT.samplingRate).toBe(1.0);
    expect(TELEMETRY_CONTRACT.rawEventTtlDays).toBe(90);
    expect(TELEMETRY_CONTRACT.maxMetadataKeys).toBeGreaterThan(0);
  });
});
