// frontend/lib/idempotency.ts
// Tier Q6 — idempotency-key helper for write-side resilience.
//
// The pattern: a client-generated UUID-shaped key is sent in the
// `Idempotency-Key` header on every POST/PATCH/DELETE that the user
// could legitimately retry (save-recipe, mark-cooked, log-meal). The
// backend stores the key briefly (default: 5s window) keyed by
// `(userId, route, key)` and short-circuits duplicate requests by
// replaying the prior 2xx response.
//
// Without this, the classic mobile failure mode is: user saves a recipe,
// the response is slow, they retap, the second request arrives at the
// server before the first response lands, two save rows are written.
//
// Frontend responsibility (this file):
//   - generate a fresh key per logical user action
//   - attach the header on the matching axios call
//   - on retry-from-error, REUSE the original key (so dedup fires)
//
// Backend responsibility (NOT yet shipped — Tier Q6 backend half):
//   - middleware that reads `Idempotency-Key`, looks up by (user, route)
//     in a short-lived in-memory cache, replays on hit, stores on miss

const HEX = '0123456789abcdef';

/**
 * Generate a fresh idempotency key. RFC 4122 v4-shaped UUID without the
 * native `crypto.randomUUID` dep (some RN runtimes / older Hermes don't
 * expose it). Math.random is fine for collision avoidance in a 5s window
 * keyed by user + route.
 */
export function newIdempotencyKey(): string {
  const buf = new Array(32);
  for (let i = 0; i < 32; i++) buf[i] = HEX[Math.floor(Math.random() * 16)];
  // Force v4 variant bits to look like real UUID v4
  buf[12] = '4';
  // Bits 14-15 of clock_seq_hi_and_reserved must be 10
  buf[16] = HEX[(parseInt(buf[16], 16) & 0x3) | 0x8];
  return (
    buf.slice(0, 8).join('') +
    '-' +
    buf.slice(8, 12).join('') +
    '-' +
    buf.slice(12, 16).join('') +
    '-' +
    buf.slice(16, 20).join('') +
    '-' +
    buf.slice(20, 32).join('')
  );
}

/**
 * Header-builder helper. Use like:
 *   const key = newIdempotencyKey();
 *   await apiClient.post('/recipes/save', body, idempotencyHeaders(key));
 *
 * Returns `{ headers: { 'Idempotency-Key': key } }` so it slots into an
 * axios config without ceremony.
 */
export function idempotencyHeaders(key: string): { headers: Record<string, string> } {
  return { headers: { 'Idempotency-Key': key } };
}

/**
 * Test-friendly check — every well-formed key is 36 chars + 4 hyphens.
 */
export function isWellFormedKey(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s);
}
