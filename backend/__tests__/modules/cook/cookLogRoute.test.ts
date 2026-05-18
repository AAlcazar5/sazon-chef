// W-D Phase 1 / D-1 — GET /api/cook/log. Cursor-paged Cook Log read.
// W-D1 invariant: the response NEVER contains a total/count (recipes are a
// like-signal store, not a countable catalog). IDOR: the controller reads
// the user ONLY from the authed request, never from query/body.
// Controller-level unit (suite mocks prisma via tests/setup.ts).

import { cookController } from '../../../src/modules/cook/cookController';
import { prisma } from '../../../src/lib/prisma';

const cookEvent = (prisma as unknown as {
  cookEvent: { findMany: jest.Mock };
}).cookEvent;

interface FakeRes {
  statusCode: number;
  body: any;
  status: jest.Mock;
  json: jest.Mock;
}
const makeRes = (): FakeRes => {
  const res: Partial<FakeRes> = { statusCode: 200 };
  res.status = jest.fn((c: number) => ((res as FakeRes).statusCode = c, res));
  res.json = jest.fn((b: unknown) => ((res as FakeRes).body = b, res));
  return res as FakeRes;
};
const req = (q: Record<string, string> = {}, userId = 'u1') =>
  ({ query: q, user: { id: userId } } as any);

const row = (id: string, iso: string) => ({
  id,
  type: 'made_it',
  recipeId: null,
  payload: '{}',
  createdAt: new Date(iso),
});

beforeEach(() => {
  cookEvent.findMany.mockReset();
});

describe('GET /api/cook/log', () => {
  it('returns { entries, nextCursor } and NEVER a total/count (W-D1)', async () => {
    cookEvent.findMany.mockResolvedValue([
      row('c2', '2026-05-18T10:00:00Z'),
      row('c1', '2026-05-17T10:00:00Z'),
    ]);
    const res = makeRes();
    await cookController.getCookLog(req({ limit: '2' }), res as any);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries).toHaveLength(2);
    // W-D1: no count/total/denominator anywhere in the payload.
    const keys = JSON.stringify(res.body);
    expect(res.body.total).toBeUndefined();
    expect(res.body.count).toBeUndefined();
    expect(/\btotal\b|\bcount\b/i.test(keys)).toBe(false);
    expect('nextCursor' in res.body).toBe(true);
  });

  it('scopes strictly to the authed user — never trusts query/body userId (IDOR)', async () => {
    cookEvent.findMany.mockResolvedValue([]);
    const res = makeRes();
    await cookController.getCookLog(
      req({ userId: 'victim', limit: '5' }, 'attacker'),
      res as any,
    );
    const where = cookEvent.findMany.mock.calls[0][0].where;
    expect(where.userId).toBe('attacker'); // authed id, NOT query.userId
    expect(where.userId).not.toBe('victim');
  });

  it('forwards a cursor as a strict "older than" filter', async () => {
    cookEvent.findMany.mockResolvedValue([]);
    const res = makeRes();
    await cookController.getCookLog(
      req({ cursor: '2026-05-17T10:00:00Z', limit: '10' }),
      res as any,
    );
    const where = cookEvent.findMany.mock.calls[0][0].where;
    expect(where.createdAt.lt).toEqual(new Date('2026-05-17T10:00:00Z'));
  });

  it('nextCursor is the last entry createdAt on a full page, null when short', async () => {
    cookEvent.findMany.mockResolvedValue([
      row('c2', '2026-05-18T10:00:00Z'),
      row('c1', '2026-05-17T10:00:00Z'),
    ]);
    const full = makeRes();
    await cookController.getCookLog(req({ limit: '2' }), full as any);
    expect(full.body.nextCursor).toBe(new Date('2026-05-17T10:00:00Z').toISOString());

    cookEvent.findMany.mockResolvedValue([row('c1', '2026-05-17T10:00:00Z')]);
    const short = makeRes();
    await cookController.getCookLog(req({ limit: '2' }), short as any);
    expect(short.body.nextCursor).toBeNull();
  });

  it('empty log → { entries: [], nextCursor: null }, 200 (not an error)', async () => {
    cookEvent.findMany.mockResolvedValue([]);
    const res = makeRes();
    await cookController.getCookLog(req(), res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ entries: [], nextCursor: null });
  });
});
