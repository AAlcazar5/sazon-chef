// ROADMAP 4.0 TB3.2 — Outcome backfill test.

import { prisma } from '../../src/lib/prisma';
import { recordOutcome } from '../../src/services/recommender/recommenderEventOutcomeService';

const upsert = jest.fn();
const findUnique = jest.fn();
(prisma as any).recommenderEventOutcome = {
  upsert,
  findUnique,
};
(prisma as any).recommenderEvent = {
  ...((prisma as any).recommenderEvent ?? {}),
  findUnique: jest.fn(),
};

describe('recordOutcome (TB3.2)', () => {
  beforeEach(() => {
    upsert.mockReset();
    findUnique.mockReset();
    (prisma as any).recommenderEvent.findUnique.mockReset();
    (prisma as any).recommenderEvent.findUnique.mockResolvedValue({
      id: 'evt1',
    });
  });

  it.each([
    ['accepted'],
    ['swapped'],
    ['escaped'],
    ['abandoned'],
  ])('writes outcome=%s with latencyMs', async (outcome) => {
    upsert.mockResolvedValue({ id: 'oc1', outcome });
    const ok = await recordOutcome({
      eventId: 'evt1',
      outcome: outcome as any,
      latencyMs: 1234,
    });
    expect(ok).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    const args = upsert.mock.calls[0][0];
    expect(args.where).toEqual({ eventId: 'evt1' });
    expect(args.create.outcome).toBe(outcome);
    expect(args.create.latencyMs).toBe(1234);
  });

  it('upsert is idempotent on duplicate event id (uses unique constraint)', async () => {
    upsert.mockResolvedValue({ id: 'oc1' });
    await recordOutcome({
      eventId: 'evt1',
      outcome: 'accepted',
      latencyMs: 100,
    });
    await recordOutcome({
      eventId: 'evt1',
      outcome: 'swapped',
      latencyMs: 100,
    });
    // Both calls upsert; second updates the row instead of inserting a duplicate.
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it('orphan outcome (no parent event) logs + drops without throwing', async () => {
    (prisma as any).recommenderEvent.findUnique.mockResolvedValue(null);
    const ok = await recordOutcome({
      eventId: 'phantom',
      outcome: 'accepted',
      latencyMs: 100,
    });
    expect(ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects invalid outcome strings', async () => {
    const ok = await recordOutcome({
      eventId: 'evt1',
      outcome: 'celebrated' as any,
      latencyMs: 100,
    });
    expect(ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('does not throw when DB write fails', async () => {
    upsert.mockRejectedValue(new Error('db down'));
    const ok = await recordOutcome({
      eventId: 'evt1',
      outcome: 'accepted',
      latencyMs: 100,
    });
    expect(ok).toBe(false);
  });
});
