// ROADMAP 4.0 IG0.2 — IngredientEvent service test.

import { prisma } from '../../src/lib/prisma';
import {
  record,
  recordMany,
  getEventsForUser,
} from '../../src/services/ingredientEventService';

const create = jest.fn();
const createMany = jest.fn();
const findMany = jest.fn();

(prisma as any).ingredientEvent = {
  ...((prisma as any).ingredientEvent ?? {}),
  create,
  createMany,
  findMany,
};

beforeEach(() => {
  create.mockReset();
  createMany.mockReset();
  findMany.mockReset();
  create.mockResolvedValue({ id: 'evt-1' });
  createMany.mockResolvedValue({ count: 0 });
  findMany.mockResolvedValue([]);
});

describe('IG0.2 — record', () => {
  it('persists a row with normalized ingredient name', async () => {
    const id = await record({
      userId: 'u1',
      ingredientName: '  Cilantro  ',
      eventType: 'purchased',
    });
    expect(id).toBe('evt-1');
    const data = create.mock.calls[0][0].data;
    expect(data.ingredientName).toBe('cilantro');
    expect(data.eventType).toBe('purchased');
    expect(data.userId).toBe('u1');
  });

  it('uses occurredAt = now when omitted', async () => {
    await record({
      userId: 'u1',
      ingredientName: 'rice',
      eventType: 'purchased',
    });
    expect(create.mock.calls[0][0].data.occurredAt).toBeInstanceOf(Date);
  });

  it('respects caller-supplied occurredAt', async () => {
    const t = new Date('2026-04-29T10:00:00Z');
    await record({
      userId: 'u1',
      ingredientName: 'rice',
      eventType: 'purchased',
      occurredAt: t,
    });
    expect(create.mock.calls[0][0].data.occurredAt).toBe(t);
  });

  it('normalizes swapTargetName when present', async () => {
    await record({
      userId: 'u1',
      ingredientName: '  Cilantro  ',
      eventType: 'swappedOut',
      swapTargetName: '  Parsley  ',
    });
    const data = create.mock.calls[0][0].data;
    expect(data.ingredientName).toBe('cilantro');
    expect(data.swapTargetName).toBe('parsley');
  });

  it('rejects empty userId', async () => {
    await expect(
      record({ userId: '', ingredientName: 'rice', eventType: 'purchased' }),
    ).rejects.toThrow(/userId/);
  });

  it('rejects empty ingredientName', async () => {
    await expect(
      record({ userId: 'u1', ingredientName: '', eventType: 'purchased' }),
    ).rejects.toThrow(/ingredientName/);
  });

  it('rejects unknown eventType', async () => {
    await expect(
      record({
        userId: 'u1',
        ingredientName: 'rice',
        eventType: 'wandered_off' as any,
      }),
    ).rejects.toThrow(/unknown eventType/);
  });

  it('PII guard rejects free-text fields', async () => {
    await expect(
      record({
        userId: 'u1',
        ingredientName: 'rice',
        eventType: 'purchased',
        notes: 'free text leak attempt',
      } as any),
    ).rejects.toThrow(/PII/);
  });

  it('returns null on prisma failure but logs', async () => {
    create.mockRejectedValueOnce(new Error('db down'));
    const id = await record({
      userId: 'u1',
      ingredientName: 'rice',
      eventType: 'purchased',
    });
    expect(id).toBeNull();
  });
});

describe('IG0.2 — recordMany', () => {
  it('returns 0 for empty input without persisting', async () => {
    const n = await recordMany([]);
    expect(n).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('all-or-nothing: any invalid event rejects the whole batch', async () => {
    await expect(
      recordMany([
        { userId: 'u1', ingredientName: 'rice', eventType: 'purchased' },
        { userId: '', ingredientName: 'milk', eventType: 'purchased' },
      ]),
    ).rejects.toThrow(/userId/);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('persists a valid batch in one call', async () => {
    createMany.mockResolvedValue({ count: 3 });
    const n = await recordMany([
      { userId: 'u1', ingredientName: 'rice', eventType: 'purchased' },
      { userId: 'u1', ingredientName: 'milk', eventType: 'purchased' },
      { userId: 'u1', ingredientName: 'eggs', eventType: 'purchased' },
    ]);
    expect(n).toBe(3);
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0].data).toHaveLength(3);
  });
});

describe('IG0.2 — getEventsForUser', () => {
  it('returns [] for empty userId', async () => {
    const rows = await getEventsForUser({ userId: '' });
    expect(rows).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('orders by occurredAt DESC', async () => {
    await getEventsForUser({ userId: 'u1' });
    expect(findMany.mock.calls[0][0].orderBy).toEqual({ occurredAt: 'desc' });
  });

  it('applies since filter when provided', async () => {
    const t = new Date('2026-04-29T00:00:00Z');
    await getEventsForUser({ userId: 'u1', since: t });
    expect(findMany.mock.calls[0][0].where.occurredAt).toEqual({ gte: t });
  });

  it('applies types filter when provided', async () => {
    await getEventsForUser({
      userId: 'u1',
      types: ['purchased', 'consumed'],
    });
    expect(findMany.mock.calls[0][0].where.eventType).toEqual({
      in: ['purchased', 'consumed'],
    });
  });

  it('applies limit when provided', async () => {
    await getEventsForUser({ userId: 'u1', limit: 50 });
    expect(findMany.mock.calls[0][0].take).toBe(50);
  });
});
