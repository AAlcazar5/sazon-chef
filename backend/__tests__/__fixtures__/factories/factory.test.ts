// ROADMAP 4.0 N11.2 — fixture factory test.

import {
  makePersonalizationContext,
  makeProposalRecord,
  makeRecommenderEvent,
  makePantryItem,
  makeWeekPlan,
  ColdContext,
  MidContext,
  HighContext,
} from './index';
import { validateEvent } from '../../../src/services/recommender/recommenderEventSchema';

describe('N11.2 — personalizationContext factory', () => {
  it('produces a sensible default record', () => {
    const ctx = makePersonalizationContext();
    expect(ctx.userId).toBe('u-test');
    expect(ctx.cookCount).toBeGreaterThan(0);
    expect(ctx.signalCoverage).toBe('high');
  });

  it('overrides apply on top of defaults', () => {
    const ctx = makePersonalizationContext({ userId: 'u-99', cookCount: 3 });
    expect(ctx.userId).toBe('u-99');
    expect(ctx.cookCount).toBe(3);
    // Untouched fields retain default
    expect(ctx.goalPhase).toBe('maintain');
  });

  it('cold/mid/high tier variants align with N2.1 thresholds', () => {
    expect(ColdContext().signalCoverage).toBe('cold');
    expect(ColdContext().cookCount).toBeLessThanOrEqual(2);
    expect(MidContext().signalCoverage).toBe('mid');
    expect(MidContext().cookCount).toBeGreaterThan(2);
    expect(MidContext().cookCount).toBeLessThanOrEqual(6);
    expect(HighContext().signalCoverage).toBe('high');
    expect(HighContext().cookCount).toBeGreaterThanOrEqual(7);
  });
});

describe('N11.2 — proposal-record factory', () => {
  it('produces a valid ProposalRecord', () => {
    const r = makeProposalRecord();
    expect(r.userId).toBe('u-test');
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.candidateIds).toContain(r.pickedRecipeId);
  });
});

describe('N11.2 — recommenderEvent factory', () => {
  it('produces a record that passes the unified validator', () => {
    const evt = makeRecommenderEvent();
    const result = validateEvent({
      userId: evt.userId,
      surface: evt.surface,
      eventType: evt.eventType,
      asOf: evt.asOf,
      pickedRecipeId: evt.pickedRecipeId,
      metadata: evt.metadata,
      position: evt.position,
      confidence: evt.confidence,
      copyLine: evt.copyLine,
      source: evt.source,
    });
    expect(result.ok).toBe(true);
  });

  it('overrides flow through to the validator output', () => {
    const evt = makeRecommenderEvent({
      surface: 'recipe_detail_similar',
      eventType: 'tap',
    });
    const result = validateEvent({ ...evt });
    expect(result.ok).toBe(true);
    expect(result.cleaned!.surface).toBe('recipe_detail_similar');
  });
});

describe('N11.2 — pantryItem factory', () => {
  it('produces a sensible default record', () => {
    const p = makePantryItem();
    expect(p.id).toBe('p-test');
    expect(p.userId).toBe('u-test');
    expect(p.source).toBe('manual');
    expect(p.createdAt).toBeInstanceOf(Date);
  });

  it('overrides apply', () => {
    const p = makePantryItem({ name: 'cilantro', category: 'herbs' });
    expect(p.name).toBe('cilantro');
    expect(p.category).toBe('herbs');
  });
});

describe('N11.2 — weekPlan factory', () => {
  it('produces 7 daily slots starting at weekStartDate', () => {
    const wp = makeWeekPlan();
    expect(wp.slots).toHaveLength(7);
    expect(wp.slots[0].date).toBe('2026-05-04');
    expect(wp.slots[6].date).toBe('2026-05-10');
  });

  it('respects weekStartDate override', () => {
    const wp = makeWeekPlan({ weekStartDate: '2026-06-01' });
    expect(wp.slots[0].date).toBe('2026-06-01');
  });
});

describe('N11.2 — factory cap', () => {
  it('exports at least one factory per major model', () => {
    // This test pins the surface area of the factories module so future
    // tier-test cleanup can rely on these being available.
    expect(typeof makePersonalizationContext).toBe('function');
    expect(typeof makeProposalRecord).toBe('function');
    expect(typeof makeRecommenderEvent).toBe('function');
    expect(typeof makePantryItem).toBe('function');
    expect(typeof makeWeekPlan).toBe('function');
  });
});
