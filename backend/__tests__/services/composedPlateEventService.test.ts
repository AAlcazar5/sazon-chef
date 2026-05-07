// ROADMAP 4.0 N7.2 — Build-a-Plate unified event logging test.

import { prisma } from '../../src/lib/prisma';
import {
  logSlotPick,
  logSlotSwap,
  logSlotLock,
  __resetDedupCacheForTests,
} from '../../src/services/composedPlateEventService';

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

describe('N7.2 — logSlotPick', () => {
  it('writes a build_a_plate_slot event with metadata', async () => {
    const id = await logSlotPick({
      userId: 'u1',
      plateId: 'plate-7',
      slot: 'protein',
      recipeId: 'r-tofu',
      position: 1,
    });
    expect(id).toBe('evt-1');
    expect(eventCreate).toHaveBeenCalledTimes(1);
    const data = eventCreate.mock.calls[0][0].data;
    const snap = JSON.parse(data.contextSnapshot);
    expect(snap.surface).toBe('build_a_plate_slot');
    expect(snap.eventType).toBe('tap');
    expect(snap.metadata.plateId).toBe('plate-7');
    expect(snap.metadata.slot).toBe('protein');
    expect(snap.metadata.position).toBe(1);
    expect(data.pickedRecipeId).toBe('r-tofu');
  });

  it('rejects via the unified validator on missing userId', async () => {
    const id = await logSlotPick({
      userId: '',
      plateId: 'plate-7',
      slot: 'protein',
      recipeId: 'r-tofu',
    });
    expect(id).toBeNull();
    expect(eventCreate).not.toHaveBeenCalled();
  });
});

describe('N7.2 — logSlotSwap', () => {
  it('writes a build_a_plate_swap event with from/to ids', async () => {
    await logSlotSwap({
      userId: 'u1',
      plateId: 'plate-7',
      slot: 'starch',
      fromRecipeId: 'r-rice',
      toRecipeId: 'r-quinoa',
    });
    const snap = JSON.parse(eventCreate.mock.calls[0][0].data.contextSnapshot);
    expect(snap.surface).toBe('build_a_plate_swap');
    expect(snap.eventType).toBe('swap');
    expect(snap.metadata.fromRecipeId).toBe('r-rice');
    expect(snap.metadata.toRecipeId).toBe('r-quinoa');
  });

  it('accepts null fromRecipeId (swap from empty slot)', async () => {
    await logSlotSwap({
      userId: 'u1',
      plateId: 'plate-7',
      slot: 'starch',
      fromRecipeId: null,
      toRecipeId: 'r-quinoa',
    });
    const snap = JSON.parse(eventCreate.mock.calls[0][0].data.contextSnapshot);
    expect(snap.metadata.fromRecipeId).toBeNull();
  });
});

describe('N7.2 — logSlotLock', () => {
  it('writes a build_a_plate_lock event with eventType: accept', async () => {
    await logSlotLock({
      userId: 'u1',
      plateId: 'plate-7',
      slot: 'protein',
      recipeId: 'r-tofu',
    });
    const snap = JSON.parse(eventCreate.mock.calls[0][0].data.contextSnapshot);
    expect(snap.surface).toBe('build_a_plate_lock');
    expect(snap.eventType).toBe('accept');
  });
});

describe('N7.2 — idempotency (200ms dedup window)', () => {
  it('drops a duplicate slot pick within the dedup window', async () => {
    const NOW = new Date('2026-05-06T12:00:00Z');
    const a = await logSlotPick({
      userId: 'u1',
      plateId: 'p1',
      slot: 'protein',
      recipeId: 'r-1',
      asOf: NOW,
    });
    const b = await logSlotPick({
      userId: 'u1',
      plateId: 'p1',
      slot: 'protein',
      recipeId: 'r-1',
      asOf: NOW, // same instant
    });
    expect(a).toBe('evt-1');
    expect(b).toBeNull();
    expect(eventCreate).toHaveBeenCalledTimes(1);
  });

  it('does not dedup events on different slots', async () => {
    await logSlotPick({
      userId: 'u1',
      plateId: 'p1',
      slot: 'protein',
      recipeId: 'r-1',
    });
    await logSlotPick({
      userId: 'u1',
      plateId: 'p1',
      slot: 'starch',
      recipeId: 'r-2',
    });
    expect(eventCreate).toHaveBeenCalledTimes(2);
  });

  it('does not dedup pick + swap + lock on the same slot (different actions)', async () => {
    const NOW = new Date('2026-05-06T12:00:00Z');
    await logSlotPick({
      userId: 'u1',
      plateId: 'p1',
      slot: 'protein',
      recipeId: 'r-1',
      asOf: NOW,
    });
    await logSlotSwap({
      userId: 'u1',
      plateId: 'p1',
      slot: 'protein',
      fromRecipeId: 'r-1',
      toRecipeId: 'r-2',
      asOf: NOW,
    });
    await logSlotLock({
      userId: 'u1',
      plateId: 'p1',
      slot: 'protein',
      recipeId: 'r-2',
      asOf: NOW,
    });
    expect(eventCreate).toHaveBeenCalledTimes(3);
  });
});

describe('N7.2 — telemetry contract conformance', () => {
  it('every Build-a-Plate event lands in the unified RecommenderEvent table', async () => {
    await logSlotPick({
      userId: 'u1',
      plateId: 'p1',
      slot: 'protein',
      recipeId: 'r-1',
    });
    await logSlotSwap({
      userId: 'u1',
      plateId: 'p1',
      slot: 'starch',
      fromRecipeId: null,
      toRecipeId: 'r-2',
    });
    await logSlotLock({
      userId: 'u1',
      plateId: 'p1',
      slot: 'side',
      recipeId: 'r-3',
    });
    // All three writes hit the same prisma model — proves single-table unification
    expect(eventCreate).toHaveBeenCalledTimes(3);
    const surfaces = eventCreate.mock.calls.map(
      (c) => JSON.parse(c[0].data.contextSnapshot).surface,
    );
    expect(surfaces).toEqual([
      'build_a_plate_slot',
      'build_a_plate_swap',
      'build_a_plate_lock',
    ]);
  });
});
