// ROADMAP 4.0 TB2.3 — Recommender rate limit test.

import {
  consumeBudget,
  resetBudget,
  __testHooks,
} from '../../src/services/recommender/recommenderRateLimitService';

describe('recommenderRateLimitService (TB2.3)', () => {
  beforeEach(() => {
    __testHooks.reset();
    delete process.env.RECOMMENDER_DAILY_BUDGET;
  });

  it('allows up to N calls/day per user (default 5)', async () => {
    const userId = 'u1';
    for (let i = 0; i < 5; i++) {
      const r = await consumeBudget(userId, new Date('2026-05-05T10:00:00Z'));
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(5 - i - 1);
    }
    const overflow = await consumeBudget(userId, new Date('2026-05-05T10:00:00Z'));
    expect(overflow.allowed).toBe(false);
    expect(overflow.remaining).toBe(0);
  });

  it('budget resets at UTC midnight', async () => {
    const userId = 'u1';
    for (let i = 0; i < 5; i++) {
      await consumeBudget(userId, new Date('2026-05-05T23:30:00Z'));
    }
    const blocked = await consumeBudget(
      userId,
      new Date('2026-05-05T23:59:00Z'),
    );
    expect(blocked.allowed).toBe(false);
    const nextDay = await consumeBudget(
      userId,
      new Date('2026-05-06T00:01:00Z'),
    );
    expect(nextDay.allowed).toBe(true);
    expect(nextDay.remaining).toBe(4);
  });

  it('admin override via env raises the per-user budget', async () => {
    process.env.RECOMMENDER_DAILY_BUDGET = '8';
    const userId = 'u1';
    for (let i = 0; i < 8; i++) {
      const r = await consumeBudget(userId, new Date('2026-05-05T10:00:00Z'));
      expect(r.allowed).toBe(true);
    }
    const overflow = await consumeBudget(
      userId,
      new Date('2026-05-05T10:00:00Z'),
    );
    expect(overflow.allowed).toBe(false);
  });

  it('isolates buckets per user', async () => {
    for (let i = 0; i < 5; i++) {
      await consumeBudget('u1', new Date('2026-05-05T10:00:00Z'));
    }
    const u2 = await consumeBudget('u2', new Date('2026-05-05T10:00:00Z'));
    expect(u2.allowed).toBe(true);
    expect(u2.remaining).toBe(4);
  });

  it('resetBudget clears a single user', async () => {
    for (let i = 0; i < 5; i++) {
      await consumeBudget('u1', new Date('2026-05-05T10:00:00Z'));
    }
    resetBudget('u1');
    const r = await consumeBudget('u1', new Date('2026-05-05T10:00:00Z'));
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(4);
  });
});
