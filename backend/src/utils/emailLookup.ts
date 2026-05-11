// backend/src/utils/emailLookup.ts
// ROADMAP 4.0 U14 — Deterministic lookup hash for encrypted-email users.
//
// Pre-U14: every login / register / forgot-password / change-password
// attempt did `prisma.user.findMany({ where: { emailEncrypted: true } })`
// plus a decrypt-and-compare loop. O(N) per attempt; at 100k users it's
// 100k decrypts per failed login.
//
// Post-U14: each User row carries `emailLookupHash` (HMAC-SHA256 of the
// normalized email with EMAIL_LOOKUP_HMAC_KEY). Lookups become O(1)
// `findUnique({ where: { emailLookupHash } })`. The encrypted email is
// kept for display; the hash is one-way + keyed so it cannot be reversed
// without the server key.
//
// Why HMAC, not plain SHA-256: a plain hash would let anyone with a
// rainbow table reverse the email column. The HMAC key turns it into a
// pseudo-random value that's only matchable by a party that holds the key.

import { createHmac } from 'crypto';

const RAW_KEY = process.env.EMAIL_LOOKUP_HMAC_KEY;

// Soft default for dev / test only: a per-process random key means dev
// hashes don't match across restarts (good — forces a configured key in
// any environment that persists data). Production MUST set this env.
const FALLBACK_DEV_KEY = (() => {
  if (process.env.NODE_ENV === 'production') return null;
  // Deterministic per-process so multiple imports within one test run
  // agree on the hash; reset between processes is fine for dev / test.
  return process.env.JEST_WORKER_ID
    ? `test-${process.env.JEST_WORKER_ID}-deterministic-key-do-not-use-in-prod`
    : 'dev-only-email-lookup-key-do-not-use-in-prod';
})();

if (process.env.NODE_ENV === 'production' && (!RAW_KEY || RAW_KEY.length < 32)) {
  throw new Error(
    'EMAIL_LOOKUP_HMAC_KEY env var is required in production and must be ≥ 32 chars. ' +
      'Generate one via: openssl rand -base64 48',
  );
}

const KEY: string = RAW_KEY && RAW_KEY.length >= 32 ? RAW_KEY : (FALLBACK_DEV_KEY ?? '');

/**
 * Normalize an email for hashing: trim, lowercase. Email addresses are
 * case-insensitive in the local part by RFC convention (every major
 * provider treats them as such), so we canonicalize before hashing.
 */
export function normalizeEmailForLookup(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Compute the lookup hash for an email. Deterministic: identical inputs
 * always produce identical 64-char hex output.
 */
export function hashEmailForLookup(email: string): string {
  if (!KEY) {
    // Should be unreachable: production throws above; dev/test always has FALLBACK.
    throw new Error('EMAIL_LOOKUP_HMAC_KEY is not configured');
  }
  return createHmac('sha256', KEY).update(normalizeEmailForLookup(email)).digest('hex');
}
