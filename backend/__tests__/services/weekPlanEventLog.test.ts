// ROADMAP 4.0 WK13.1 — Week-plan event logging test.

import { prisma } from '../../src/lib/prisma';
import {
  logWeekPlanEvent,
  __resetWeekPlanDedupCacheForTests,
  __DEDUP_WINDOW_MS,
} from '../../src/services/recommender/weekPlanEventLog';

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
    return Promise.resolve({ id: `wk-evt-${counter}` });
  });
  __resetWeekPlanDedupCacheForTests();
});

const NOW = new Date('2026-05-06T12:00:00Z');

describe('WK13.1 — logWeekPlanEvent', () => {
  it('persists a plan_generate event with the correct shape', async () => {
    const id = await logWeekPlanEvent({
      userId: 'u1',
      surface: 'week_plan_event',
      eventType: 'plan_generate',
      asOf: NOW,
      metadata: { weekStart: '2026-05-04' },
    });
    expect(id).toBe('wk-evt-1');
    const data = eventCreate.mock.calls[0][0].data;
    const snap = JSON.parse(data.contextSnapshot);
    expect(snap.surface).toBe('week_plan_event');
    expect(snap.eventType).toBe('plan_generate');
    expect(snap.metadata.weekStart).toBe('2026-05-04');
  });

  it('persists slot_swap + regenerate_day + copy_last_week + optimize_cost surfaces', async () => {
    const eventTypes = [
      'slot_swap',
      'regenerate_day',
      'copy_last_week',
      'optimize_cost',
      'save_template',
      'apply_template',
    ] as const;
    for (let i = 0; i < eventTypes.length; i++) {
      await logWeekPlanEvent({
        userId: 'u1',
        surface: 'week_slot',
        eventType: eventTypes[i],
        slotDate: `2026-05-0${i + 1}`,
        slotKind: 'dinner',
        asOf: new Date(NOW.getTime() + i * 1000),
      });
    }
    expect(eventCreate).toHaveBeenCalledTimes(eventTypes.length);
    const persistedTypes = eventCreate.mock.calls.map(
      (c) => JSON.parse(c[0].data.contextSnapshot).eventType,
    );
    expect(persistedTypes).toEqual(eventTypes as unknown as string[]);
  });

  it('embeds slotDate + slotKind in metadata', async () => {
    await logWeekPlanEvent({
      userId: 'u1',
      surface: 'week_slot',
      eventType: 'slot_swap',
      slotDate: '2026-05-08',
      slotKind: 'lunch',
      pickedRecipeId: 'r-fesenjan',
      asOf: NOW,
    });
    const snap = JSON.parse(eventCreate.mock.calls[0][0].data.contextSnapshot);
    expect(snap.metadata.slotDate).toBe('2026-05-08');
    expect(snap.metadata.slotKind).toBe('lunch');
    expect(eventCreate.mock.calls[0][0].data.pickedRecipeId).toBe('r-fesenjan');
  });

  it('returns null on empty userId without persisting', async () => {
    const id = await logWeekPlanEvent({
      userId: '',
      surface: 'week_plan_event',
      eventType: 'plan_generate',
    });
    expect(id).toBeNull();
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it('idempotent: dedups within DEDUP_WINDOW_MS for same (user, surface, eventType, slot)', async () => {
    await logWeekPlanEvent({
      userId: 'u1',
      surface: 'week_slot',
      eventType: 'slot_swap',
      slotDate: '2026-05-08',
      slotKind: 'dinner',
      asOf: NOW,
    });
    await logWeekPlanEvent({
      userId: 'u1',
      surface: 'week_slot',
      eventType: 'slot_swap',
      slotDate: '2026-05-08',
      slotKind: 'dinner',
      asOf: new Date(NOW.getTime() + 1000), // 1s later — within dedup window
    });
    expect(eventCreate).toHaveBeenCalledTimes(1);
  });

  it('writes again after DEDUP_WINDOW_MS elapses', async () => {
    await logWeekPlanEvent({
      userId: 'u1',
      surface: 'week_slot',
      eventType: 'slot_swap',
      slotDate: '2026-05-08',
      slotKind: 'dinner',
      asOf: NOW,
    });
    await logWeekPlanEvent({
      userId: 'u1',
      surface: 'week_slot',
      eventType: 'slot_swap',
      slotDate: '2026-05-08',
      slotKind: 'dinner',
      asOf: new Date(NOW.getTime() + __DEDUP_WINDOW_MS + 100),
    });
    expect(eventCreate).toHaveBeenCalledTimes(2);
  });

  it('different slotDate keys are not deduped', async () => {
    await logWeekPlanEvent({
      userId: 'u1',
      surface: 'week_slot',
      eventType: 'slot_swap',
      slotDate: '2026-05-08',
      asOf: NOW,
    });
    await logWeekPlanEvent({
      userId: 'u1',
      surface: 'week_slot',
      eventType: 'slot_swap',
      slotDate: '2026-05-09',
      asOf: new Date(NOW.getTime() + 1000),
    });
    expect(eventCreate).toHaveBeenCalledTimes(2);
  });

  it('PII guard: free-text fields rejected by the unified validator', async () => {
    await logWeekPlanEvent({
      userId: 'u1',
      surface: 'week_plan_event',
      eventType: 'plan_generate',
      metadata: {
        note: 'This is a private user note — should be stripped',
        comment: 'also private',
        weekStart: '2026-05-04',
      },
      asOf: NOW,
    });
    const snap = JSON.parse(eventCreate.mock.calls[0][0].data.contextSnapshot);
    expect(snap.metadata.note).toBeUndefined();
    expect(snap.metadata.comment).toBeUndefined();
    expect(snap.metadata.weekStart).toBe('2026-05-04');
  });

  it('writes to the unified recommenderEvent table (no sibling table)', async () => {
    await logWeekPlanEvent({
      userId: 'u1',
      surface: 'week_plan_event',
      eventType: 'plan_generate',
      asOf: NOW,
    });
    // The mock is wired specifically to prisma.recommenderEvent.create —
    // a sibling-table write would not hit it.
    expect(eventCreate).toHaveBeenCalledTimes(1);
  });

  it('exposes DEDUP_WINDOW_MS for cap-test inspection', () => {
    expect(__DEDUP_WINDOW_MS).toBe(60 * 1000);
  });
});
