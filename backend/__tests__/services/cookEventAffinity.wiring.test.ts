// W-A3 wiring — recordCookEvent feeds the affinity loop as a non-blocking
// byproduct. slotAffinityService is mocked so this isolates the wiring
// (does the right AffinityEvent fire? is it truly non-blocking?) from the
// affinity internals + the scoring delta map.

jest.mock('../../src/services/slotAffinityService', () => ({
  recordAffinityEvent: jest.fn().mockResolvedValue(undefined),
}));

import { recordCookEvent } from '../../src/services/cookEventService';
import { recordAffinityEvent } from '../../src/services/slotAffinityService';
import { prisma } from '../../src/lib/prisma';

const recordAffinity = recordAffinityEvent as jest.Mock;
const cookEvent = (prisma as unknown as {
  cookEvent: { create: jest.Mock };
}).cookEvent;

beforeEach(() => {
  recordAffinity.mockReset().mockResolvedValue(undefined);
  cookEvent.create.mockReset().mockResolvedValue({ id: 'ce1', recipeId: null });
});

describe('recordCookEvent → affinity loop wiring', () => {
  it('a made_it event feeds a plate_cooked AffinityEvent', async () => {
    await recordCookEvent({
      userId: 'u1',
      recipeId: 'r1',
      type: 'made_it',
      payload: { componentIds: ['c1', 'c2'] },
    });
    expect(recordAffinity).toHaveBeenCalledTimes(1);
    expect(recordAffinity).toHaveBeenCalledWith({
      type: 'plate_cooked',
      userId: 'u1',
      componentIds: ['c1', 'c2'],
    });
  });

  it('a note event carries no slot signal — affinity is NOT fed', async () => {
    await recordCookEvent({ userId: 'u1', type: 'note', payload: { text: 'hi' } });
    expect(recordAffinity).not.toHaveBeenCalled();
  });

  it('a scale event maps to null (batch-bias, not a slot delta) — not fed', async () => {
    await recordCookEvent({ userId: 'u1', type: 'scale', payload: { factor: 2 } });
    expect(recordAffinity).not.toHaveBeenCalled();
  });

  it('the affinity feed is non-blocking: a feed failure still returns the captured event', async () => {
    recordAffinity.mockRejectedValueOnce(new Error('affinity down'));
    const created = await recordCookEvent({
      userId: 'u1',
      type: 'made_it',
      payload: { componentIds: ['c1'] },
    });
    expect(created).toEqual({ id: 'ce1', recipeId: null });
    expect(cookEvent.create).toHaveBeenCalledTimes(1);
  });
});
