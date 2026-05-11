// backend/src/middleware/cacheControl.ts
// ROADMAP 4.0 U8 — Cache-Control on heavy read endpoints.
//
// Beyond `/uploads` (P7), zero `Cache-Control` headers ship on backend read
// routes. Home-feed, recipe-of-the-day, today's plate all hit the DB on
// every load — even when the user re-opens the app within seconds. A short
// `private, max-age=60, stale-while-revalidate=300` shaves repeat-load
// latency without risking stale data: each user has their own cache copy
// (private), revalidate after 60s, serve stale for up to 5 min while
// revalidating in the background.

import type { RequestHandler } from 'express';

interface CacheControlOptions {
  /** Max-age in seconds (how long the cache is fresh). Default: 60. */
  maxAge?: number;
  /** Stale-while-revalidate in seconds. Default: 300 (5 minutes). */
  staleWhileRevalidate?: number;
  /**
   * Visibility: `private` (per-user, default — user-personalized payloads)
   * or `public` (shared across users — recipe-of-the-day etc).
   */
  visibility?: 'private' | 'public';
}

/**
 * Build a `Cache-Control` middleware. Idempotent — setting the header more
 * than once is a no-op (last write wins, but the value is deterministic).
 */
export function cacheControl(options: CacheControlOptions = {}): RequestHandler {
  const maxAge = options.maxAge ?? 60;
  const swr = options.staleWhileRevalidate ?? 300;
  const visibility = options.visibility ?? 'private';
  const headerValue = `${visibility}, max-age=${maxAge}, stale-while-revalidate=${swr}`;
  return (_req, res, next) => {
    res.setHeader('Cache-Control', headerValue);
    next();
  };
}

/** Convenience: private, short-lived (60s + 5min SWR). For per-user feeds. */
export const shortPrivateCache = cacheControl({
  maxAge: 60,
  staleWhileRevalidate: 300,
  visibility: 'private',
});

/** Convenience: private, medium-lived (5min + 30min SWR). For recipe-of-the-day. */
export const mediumPrivateCache = cacheControl({
  maxAge: 5 * 60,
  staleWhileRevalidate: 30 * 60,
  visibility: 'private',
});
