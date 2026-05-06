// ROADMAP 4.0 HX7.1 — homeSurfaceEvent logging.

import { prisma } from '../../src/lib/prisma';
import {
  logHomeSurfaceEvent,
  sanitizeMetadata,
  __resetDedupCacheForTests,
} from '../../src/services/homeSurfaceEventLog';

const eventCreate = jest.fn();
(prisma as any).recommenderEvent = {
  ...((prisma as any).recommenderEvent ?? {}),
  create: eventCreate,
};

beforeEach(() => {
  eventCreate.mockReset();
  eventCreate.mockResolvedValue({ id: 'evt-home' });
  __resetDedupCacheForTests();
});

describe('logHomeSurfaceEvent (HX7.1)', () => {
  it('writes a recommenderEvent with the home surface sentinel', async () => {
    const id = await logHomeSurfaceEvent({
      userId: 'u1',
      surface: 'today_hero',
      eventType: 'impression',
    });
    expect(id).toBe('evt-home');
    const data = eventCreate.mock.calls[0][0].data;
    const snap = JSON.parse(data.contextSnapshot);
    expect(snap.surface).toBe('home_today_hero');
    expect(snap.eventType).toBe('impression');
    expect(data.userId).toBe('u1');
  });

  it('persists position + sanitized metadata', async () => {
    await logHomeSurfaceEvent({
      userId: 'u1',
      surface: 'almost_made_it',
      eventType: 'tap',
      position: 2,
      metadata: { recipeId: 'r-42', marginVsCut: 0.04, search: 'sneaky-pii' },
    });
    const snap = JSON.parse(eventCreate.mock.calls[0][0].data.contextSnapshot);
    expect(snap.position).toBe(2);
    expect(snap.metadata).toEqual({ recipeId: 'r-42', marginVsCut: 0.04 });
    // PII guard
    expect(snap.metadata.search).toBeUndefined();
  });

  it('drops a duplicate event fired within the dedup window', async () => {
    await logHomeSurfaceEvent({ userId: 'u1', surface: 'today_hero', eventType: 'tap' });
    const second = await logHomeSurfaceEvent({ userId: 'u1', surface: 'today_hero', eventType: 'tap' });
    expect(second).toBeNull();
    expect(eventCreate).toHaveBeenCalledTimes(1);
  });

  it('does not dedup events on different surfaces', async () => {
    await logHomeSurfaceEvent({ userId: 'u1', surface: 'today_hero', eventType: 'tap' });
    await logHomeSurfaceEvent({ userId: 'u1', surface: 'almost_made_it', eventType: 'tap' });
    expect(eventCreate).toHaveBeenCalledTimes(2);
  });

  it('does not dedup events from different users', async () => {
    await logHomeSurfaceEvent({ userId: 'u1', surface: 'today_hero', eventType: 'tap' });
    await logHomeSurfaceEvent({ userId: 'u2', surface: 'today_hero', eventType: 'tap' });
    expect(eventCreate).toHaveBeenCalledTimes(2);
  });

  it('returns null and never throws on prisma errors', async () => {
    eventCreate.mockRejectedValueOnce(new Error('db down'));
    const id = await logHomeSurfaceEvent({
      userId: 'u1',
      surface: 'today_hero',
      eventType: 'impression',
    });
    expect(id).toBeNull();
  });

  it('uses occurredAt when supplied', async () => {
    const t = new Date('2026-05-06T12:00:00Z');
    await logHomeSurfaceEvent({
      userId: 'u1',
      surface: 'today_hero',
      eventType: 'impression',
      occurredAt: t,
    });
    expect(eventCreate.mock.calls[0][0].data.asOf).toBe(t);
  });
});

describe('sanitizeMetadata', () => {
  it('drops PII keys', () => {
    const r = sanitizeMetadata({ keep: 1, search: 'pii', cravingQuery: 'pii', note: 'pii' });
    expect(r).toEqual({ keep: 1 });
  });

  it('drops nested objects + arrays', () => {
    const r = sanitizeMetadata({ keep: 'ok', list: [1, 2, 3], obj: { a: 1 } });
    expect(r).toEqual({ keep: 'ok' });
  });

  it('preserves null', () => {
    expect(sanitizeMetadata({ x: null })).toEqual({ x: null });
  });
});
