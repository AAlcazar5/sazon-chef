// ROADMAP 4.0 IG0.1 — PantryItem service test.

import { prisma } from '../../src/lib/prisma';
import {
  addItem,
  consumeItem,
  lookupExpiryHint,
  INGREDIENT_LIFESPAN_DEFAULTS,
} from '../../src/services/pantryItemService';

const upsert = jest.fn();
const findUnique = jest.fn();
const update = jest.fn();

(prisma as any).pantryItem = {
  ...((prisma as any).pantryItem ?? {}),
  upsert,
  findUnique,
  update,
};

beforeEach(() => {
  upsert.mockReset();
  findUnique.mockReset();
  update.mockReset();
  upsert.mockResolvedValue({ id: 'p1' });
  update.mockResolvedValue({ id: 'p1' });
});

describe('IG0.1 — INGREDIENT_LIFESPAN_DEFAULTS', () => {
  it('publishes the default lifespan map for cap-test inspection', () => {
    expect(INGREDIENT_LIFESPAN_DEFAULTS.cilantro).toBe(5);
    expect(INGREDIENT_LIFESPAN_DEFAULTS.milk).toBe(10);
    expect(INGREDIENT_LIFESPAN_DEFAULTS.eggs).toBe(30);
    expect(INGREDIENT_LIFESPAN_DEFAULTS.rice).toBe(365);
  });

  it('lookupExpiryHint normalizes the input name', () => {
    expect(lookupExpiryHint('Cilantro')).toBe(5);
    expect(lookupExpiryHint('  CILANTRO  ')).toBe(5);
  });

  it('returns null for unknown ingredients', () => {
    expect(lookupExpiryHint('mystery item')).toBeNull();
  });
});

describe('IG0.1 — addItem', () => {
  it('rejects empty userId / name', async () => {
    await expect(addItem({ userId: '', name: 'rice' })).rejects.toThrow(/userId/);
    await expect(addItem({ userId: 'u1', name: '' })).rejects.toThrow(/name/);
  });

  it('populates expiryHint from the lifespan map when known', async () => {
    await addItem({ userId: 'u1', name: 'cilantro' });
    const args = upsert.mock.calls[0][0];
    expect(args.create.expiryHint).toBe(5);
    expect(args.create.userId).toBe('u1');
    expect(args.create.source).toBe('manual');
  });

  it('falls back to null expiryHint for unknown ingredients', async () => {
    await addItem({ userId: 'u1', name: 'sazon spice blend' });
    const args = upsert.mock.calls[0][0];
    expect(args.create.expiryHint).toBeNull();
  });

  it('honors caller-supplied expiryHint override', async () => {
    await addItem({ userId: 'u1', name: 'cilantro', expiryHint: 14 });
    const args = upsert.mock.calls[0][0];
    expect(args.create.expiryHint).toBe(14);
  });

  it('quantity / unit / category propagate', async () => {
    await addItem({
      userId: 'u1',
      name: 'rice',
      quantity: 2,
      unit: 'cup',
      category: 'grains',
    });
    const args = upsert.mock.calls[0][0];
    expect(args.create.quantity).toBe(2);
    expect(args.create.unit).toBe('cup');
    expect(args.create.category).toBe('grains');
  });

  it('addedFromRecipeId records provenance', async () => {
    await addItem({
      userId: 'u1',
      name: 'soy sauce',
      addedFromRecipeId: 'r-stir-fry',
    });
    expect(upsert.mock.calls[0][0].create.addedFromRecipeId).toBe('r-stir-fry');
  });
});

describe('IG0.1 — consumeItem', () => {
  it('rejects missing id', async () => {
    await expect(consumeItem({ id: '' })).rejects.toThrow(/id/);
  });

  it('returns null when the item does not exist', async () => {
    findUnique.mockResolvedValue(null);
    const result = await consumeItem({ id: 'ghost' });
    expect(result).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('decrements quantity when both quantity and amount are set', async () => {
    findUnique.mockResolvedValue({ quantity: 3 });
    const NOW = new Date('2026-05-06T18:00:00Z');
    await consumeItem({ id: 'p1', amount: 1, now: NOW });
    const args = update.mock.calls[0][0];
    expect(args.data.quantity).toBe(2);
    expect(args.data.lastConsumedAt).toBe(NOW);
  });

  it('floors at 0 (never goes negative)', async () => {
    findUnique.mockResolvedValue({ quantity: 1 });
    await consumeItem({ id: 'p1', amount: 5 });
    expect(update.mock.calls[0][0].data.quantity).toBe(0);
  });

  it('writes lastConsumedAt without changing quantity when amount unset', async () => {
    findUnique.mockResolvedValue({ quantity: 3 });
    await consumeItem({ id: 'p1' });
    const args = update.mock.calls[0][0];
    expect(args.data.quantity).toBe(3);
    expect(args.data.lastConsumedAt).toBeInstanceOf(Date);
  });

  it('preserves null quantity (item without tracked qty)', async () => {
    findUnique.mockResolvedValue({ quantity: null });
    await consumeItem({ id: 'p1', amount: 1 });
    expect(update.mock.calls[0][0].data.quantity).toBeNull();
  });
});
