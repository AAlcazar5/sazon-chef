// backend/src/utils/sentryCapture.ts
// ROADMAP 4.0 U9 — Centralized Sentry captureException for failure paths.
//
// Routes / services that catch + swallow errors (or down-grade to a logger.warn
// call) must also surface the failure to Sentry, otherwise post-launch error
// triage requires log archaeology. This helper wraps `Sentry.captureException`
// with a tag + extra payload so every capture site is greppable by feature.
//
// Separate from Tier-Q M4 (gated SLO transactions): those are perf timings;
// this is error capture for the catch-and-continue pattern.

import * as Sentry from '@sentry/node';
import { logger } from './logger';

interface CaptureContext {
  /** Short tag identifying the capture site, e.g. "ai.claude.generate". */
  tag: string;
  /** Optional structured payload (userId, recipeId, model, etc.). */
  extra?: Record<string, unknown>;
}

/**
 * Capture an error to Sentry with a uniform shape. Safe to call from any
 * catch block. Always logs locally too — Sentry is the breadcrumb, the
 * structured logger is the primary record.
 */
export function captureException(err: unknown, ctx: CaptureContext): void {
  try {
    Sentry.withScope((scope) => {
      scope.setTag('feature', ctx.tag);
      if (ctx.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) {
          scope.setExtra(k, v);
        }
      }
      Sentry.captureException(err);
    });
  } catch (sentryErr) {
    // Sentry failures must never mask the original error path.
    logger.warn({ tag: ctx.tag, sentryErr }, '[sentryCapture] Sentry capture failed');
  }
  logger.error(
    {
      err,
      tag: ctx.tag,
      ...ctx.extra,
    },
    `[${ctx.tag}] ${err instanceof Error ? err.message : String(err)}`,
  );
}
