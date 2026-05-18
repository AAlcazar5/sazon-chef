// W-A1 — Cook Log capture + recall (unit; the suite mocks prisma via
// tests/setup.ts, so we assert call SHAPE, not a real DB round-trip).
// Acceptance criteria 2/3/7:
//  - one typed event per capture, payload JSON-serialized
//  - recall is STRICTLY user-scoped (IDOR: where is exactly { userId })
//  - capture works with no recipeId (the §9a Claude-ingest path)

import { prisma } from '../../src/lib/prisma';
import {
  recordCookEvent,
  getCookLog,
} from '../../src/services/cookEventService';

const cookEvent = (prisma as unknown as {
  cookEvent: {
    create: jest.Mock;
    findMany: jest.Mock;
  };
}).cookEvent;

beforeEach(() => {
  cookEvent.create.mockReset();
  cookEvent.findMany.mockReset();
  cookEvent.create.mockResolvedValue({ id: 'ce1', recipeId: null });
});

describe('recordCookEvent', () => {
  it('creates exactly one event with a JSON-serialized payload, recipeId null by default', async () => {
    await recordCookEvent({
      userId: 'u1',
      type: 'scale',
      payload: { from: { amount: 20, unit: 'oz' }, factor: 1.6 },
    });
    expect(cookEvent.create).toHaveBeenCalledTimes(1);
    expect(cookEvent.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        recipeId: null,
        type: 'scale',
        payload: JSON.stringify({ from: { amount: 20, unit: 'oz' }, factor: 1.6 }),
      },
    });
  });

  it('passes a provided recipeId through', async () => {
    await recordCookEvent({ userId: 'u1', recipeId: 'r9', type: 'made_it', payload: {} });
    expect(cookEvent.create).toHaveBeenCalledWith({
      data: { userId: 'u1', recipeId: 'r9', type: 'made_it', payload: '{}' },
    });
  });
});

describe('getCookLog — strict user scoping (IDOR) + shape', () => {
  it('queries with exactly { where: { userId }, newest-first }', async () => {
    cookEvent.findMany.mockResolvedValue([]);
    await getCookLog('u1');
    const arg = cookEvent.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ userId: 'u1' }); // no widening — the IDOR guarantee
    expect(arg.orderBy).toEqual({ createdAt: 'desc' });
    expect(arg.take).toBeUndefined();
  });

  it('applies take only when a positive limit is given', async () => {
    cookEvent.findMany.mockResolvedValue([]);
    await getCookLog('u1', { limit: 5 });
    expect(cookEvent.findMany.mock.calls[0][0].take).toBe(5);
  });

  it('returns [] for no rows (not an error)', async () => {
    cookEvent.findMany.mockResolvedValue([]);
    await expect(getCookLog('nobody')).resolves.toEqual([]);
  });

  it('parses payload back to an object and tolerates bad JSON', async () => {
    const now = new Date();
    cookEvent.findMany.mockResolvedValue([
      { id: 'a', type: 'scale', recipeId: 'r1', payload: '{"factor":2}', createdAt: now },
      { id: 'b', type: 'note', recipeId: null, payload: 'not json', createdAt: now },
    ]);
    const log = await getCookLog('u1');
    expect(log[0]).toEqual({
      id: 'a', type: 'scale', recipeId: 'r1', payload: { factor: 2 }, createdAt: now,
    });
    expect(log[1].payload).toEqual({}); // malformed → {} (never throws)
  });
});
