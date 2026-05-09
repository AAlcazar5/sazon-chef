// H12: requestId middleware tests.
//
// Verifies:
//   - mints a UUID when no inbound X-Request-Id is present
//   - honors a UUID-shaped inbound X-Request-Id
//   - rejects garbage inbound IDs (log poisoning guard)
//   - echoes the requestId on the response header
//   - exposes a child logger on res.locals.logger

import { Request, Response } from 'express';
import { requestIdMiddleware } from '../../src/middleware/requestId';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeReqRes(headers: Record<string, string> = {}) {
  const setHeader = jest.fn();
  const res = {
    locals: {} as Record<string, unknown>,
    setHeader,
  } as unknown as Response;
  const req = {
    method: 'GET',
    path: '/api/recipes',
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
  return { req, res, setHeader };
}

describe('requestIdMiddleware (H12)', () => {
  it('mints a UUID when no X-Request-Id is provided', () => {
    const { req, res, setHeader } = makeReqRes();
    requestIdMiddleware(req, res, () => undefined);
    expect(typeof res.locals.requestId).toBe('string');
    expect(UUID_RE.test(res.locals.requestId as string)).toBe(true);
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', res.locals.requestId);
  });

  it('honors a valid UUID inbound X-Request-Id', () => {
    const inbound = '11111111-2222-3333-4444-555555555555';
    const { req, res } = makeReqRes({ 'x-request-id': inbound });
    requestIdMiddleware(req, res, () => undefined);
    expect(res.locals.requestId).toBe(inbound);
  });

  it('rejects garbage inbound X-Request-Id and mints fresh', () => {
    const { req, res } = makeReqRes({ 'x-request-id': 'not-a-uuid; DROP TABLE users--' });
    requestIdMiddleware(req, res, () => undefined);
    expect(res.locals.requestId).not.toBe('not-a-uuid; DROP TABLE users--');
    expect(UUID_RE.test(res.locals.requestId as string)).toBe(true);
  });

  it('attaches a pino child logger bound to res.locals.logger', () => {
    const { req, res } = makeReqRes();
    requestIdMiddleware(req, res, () => undefined);
    expect(res.locals.logger).toBeDefined();
    // Pino logger has .info / .error / .child
    const log = res.locals.logger as { info: unknown; error: unknown; child: unknown };
    expect(typeof log.info).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.child).toBe('function');
  });

  it('calls next() exactly once', () => {
    const { req, res } = makeReqRes();
    const next = jest.fn();
    requestIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
