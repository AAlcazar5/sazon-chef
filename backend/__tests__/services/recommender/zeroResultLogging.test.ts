// ROADMAP 4.0 FX3.3 — zero-result filter combo logging.

import { prisma } from '../../../src/lib/prisma';
import {
  recordZeroResultFilter,
  ZERO_RESULT_FILTER_SURFACE,
  ZERO_RESULT_EVENT_TYPE,
} from '../../../src/services/recommender/recommenderEventService';

const eventCreate = jest.fn();
(prisma as any).recommenderEvent = {
  ...((prisma as any).recommenderEvent ?? {}),
  create: eventCreate,
};

describe('recordZeroResultFilter (FX3.3)', () => {
  beforeEach(() => {
    eventCreate.mockReset();
    eventCreate.mockResolvedValue({ id: 'evt-zero' });
  });

  it('writes a recommenderEvent with the zero-result sentinel and structured filters', async () => {
    const id = await recordZeroResultFilter({
      userId: 'u1',
      filters: { quick: true, highProtein: true, vegan: true },
    });
    expect(id).toBe('evt-zero');
    expect(eventCreate).toHaveBeenCalledTimes(1);
    const data = eventCreate.mock.calls[0][0].data;
    expect(data.userId).toBe('u1');
    expect(data.source).toBe('retrieval_fallback');
    expect(data.pickedRecipeId).toBeNull();
    expect(data.confidence).toBe(0);

    const snap = JSON.parse(data.contextSnapshot);
    expect(snap.surface).toBe(ZERO_RESULT_FILTER_SURFACE);
    expect(snap.eventType).toBe(ZERO_RESULT_EVENT_TYPE);
    expect(snap.filters).toEqual({ quick: true, highProtein: true, vegan: true });
  });

  it('strips PII keys (search / cravingQuery) from the persisted filter set', async () => {
    await recordZeroResultFilter({
      userId: 'u2',
      filters: { quick: true, search: 'mom maiden name', cravingQuery: 'spicy chicken' },
    });
    const data = eventCreate.mock.calls[0][0].data;
    const snap = JSON.parse(data.contextSnapshot);
    expect(snap.filters).toEqual({ quick: true });
    expect(snap.filters.search).toBeUndefined();
    expect(snap.filters.cravingQuery).toBeUndefined();
  });

  it('returns null and does not throw when prisma errors', async () => {
    eventCreate.mockRejectedValueOnce(new Error('db down'));
    const id = await recordZeroResultFilter({
      userId: 'u3',
      filters: { quick: true },
    });
    expect(id).toBeNull();
  });

  it('uses provided asOf date if supplied', async () => {
    const t = new Date('2026-05-06T12:00:00Z');
    await recordZeroResultFilter({ userId: 'u4', asOf: t, filters: { quick: true } });
    expect(eventCreate.mock.calls[0][0].data.asOf).toBe(t);
  });
});
