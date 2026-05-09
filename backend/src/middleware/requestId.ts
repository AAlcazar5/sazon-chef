// backend/src/middleware/requestId.ts
// H12: per-request trace ID. Bound to a pino child logger on res.locals
// and surfaced on the X-Request-Id response header so support can ask
// "what was the X-Request-Id from the failing screenshot?" and grep
// production logs by it.
//
// Usage in handlers:
//   const log = res.locals.logger ?? logger;
//   log.info({ recipeId }, 'recipe.created');
//   // → log line includes requestId + (optionally) userId.
//
// Honors an inbound X-Request-Id (load balancer / mobile client may set
// one) but only if it looks like a UUID — otherwise we mint a fresh one
// to prevent log poisoning.

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import type { Logger } from 'pino';
import { logger as rootLogger } from '../utils/logger';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      requestId?: string;
      logger?: Logger;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const inbound = req.header('x-request-id');
  const requestId = inbound && UUID_RE.test(inbound) ? inbound : randomUUID();

  res.locals.requestId = requestId;
  res.locals.logger = rootLogger.child({
    requestId,
    method: req.method,
    path: req.path,
  });

  // Echo back so the mobile client / support can reference it in bug reports.
  res.setHeader('X-Request-Id', requestId);

  next();
}
