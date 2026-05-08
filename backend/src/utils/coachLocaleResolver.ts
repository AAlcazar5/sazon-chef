// ROADMAP 4.0 Tier $$ — i18n route plumbing — locale resolution helper.
//
// Resolves the BCP 47 locale to use for a given coach turn. Priority chain:
//   1. User.locale (persisted preference — highest priority)
//   2. Accept-Language header (auto-detected from device on first call)
//   3. 'en' (safe default)
//
// Each entry resolves through the known-locales set in coachPromptService
// (resolveCoachLocale walks the BCP 47 fallback chain). Anything unknown
// drops to its base language and ultimately to English.
//
// Auto-persist: when User.locale is unset AND Accept-Language indicates a
// Spanish-speaking device, callers should write the detected locale to the
// User row so subsequent turns skip the header parsing. `shouldPersistAutoDetected`
// returns the locale to persist, or null if nothing to do.

import {
  resolveCoachLocale,
  type CoachLocale,
} from '../services/coachPromptService';

interface AcceptLanguageEntry {
  tag: string;
  q: number;
}

/**
 * Parse an Accept-Language header into an ordered list of BCP 47 tags
 * (highest q first). Tolerates malformed entries.
 */
export function parseAcceptLanguage(header: string | undefined | null): string[] {
  if (!header) return [];
  const entries: AcceptLanguageEntry[] = [];
  for (const raw of header.split(',')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const [tagPart, ...params] = trimmed.split(';').map((s) => s.trim());
    if (!tagPart) continue;
    let q = 1;
    for (const p of params) {
      const m = p.match(/^q\s*=\s*([\d.]+)$/i);
      if (m) {
        const parsed = Number.parseFloat(m[1]);
        if (Number.isFinite(parsed)) q = parsed;
      }
    }
    entries.push({ tag: tagPart, q });
  }
  // Stable ordering: q desc, then declaration order.
  entries.sort((a, b) => b.q - a.q);
  return entries.map((e) => e.tag);
}

export interface ResolveLocaleInput {
  userId: string;
  acceptLanguageHeader: string | undefined | null;
  /** Read the user's persisted locale (or null if not set). Injected for testability. */
  readUserLocale: (userId: string) => Promise<string | null>;
  /**
   * Optional callback fired when the resolver auto-detects a non-English
   * locale from the Accept-Language header AND the User.locale is currently
   * null. Caller is expected to write the value to the User row so subsequent
   * turns skip header parsing. Errors are swallowed (fire-and-forget — never
   * blocks the turn).
   */
  onAutoDetected?: (userId: string, locale: CoachLocale) => Promise<void> | void;
}

/**
 * Resolve the locale for a coach turn. Uses the user's TOP Accept-Language
 * tag (highest q-value) as the signal — not the whole chain. This matches
 * "your device's primary language wins" semantics: a user with
 * `Accept-Language: en;q=1, es-MX;q=0.5` is fundamentally English-primary
 * even though they also speak Spanish.
 */
export async function resolveLocaleForRequest(
  input: ResolveLocaleInput,
): Promise<CoachLocale> {
  // 1. User.locale (if set + resolves to a known locale)
  const persisted = await input.readUserLocale(input.userId);
  if (persisted) {
    const resolved = resolveCoachLocale(persisted);
    if (resolved !== 'en' || persisted === 'en') return resolved;
    // Persisted value was unknown (resolved to en but wasn't en); fall through
    // to the header so we can recover. Don't fire auto-detect — the user
    // already had a (now-broken) preference, not a clean slate.
  }
  // 2. Accept-Language top-tag
  const tags = parseAcceptLanguage(input.acceptLanguageHeader);
  if (tags.length > 0) {
    const top = tags[0];
    const resolved = resolveCoachLocale(top);
    if (resolved !== 'en') {
      // Auto-persist on first detection — only when User.locale was null.
      if (input.onAutoDetected && persisted == null) {
        try {
          const maybePromise = input.onAutoDetected(input.userId, resolved);
          if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
            (maybePromise as Promise<void>).catch(() => {
              // Swallow — auto-persist failure is non-blocking. Next turn will
              // re-detect from the header.
            });
          }
        } catch {
          // sync throw — also swallow.
        }
      }
      return resolved;
    }
  }
  // 3. English fallback
  return 'en';
}

/**
 * Returns the locale to PERSIST on the User row when auto-detection applies.
 * Only fires when:
 *   - User.locale is currently unset (null)
 *   - Accept-Language indicates a non-English locale we support
 *
 * Returns null if no auto-detection should happen.
 */
function shouldPersistAutoDetected(
  currentLocale: string | null,
  acceptLanguage: string | undefined | null,
): CoachLocale | null {
  if (currentLocale != null) return null;
  const tags = parseAcceptLanguage(acceptLanguage);
  if (tags.length === 0) return null;
  // Top-tag semantics: the user's primary language is the signal. A device
  // configured "English primary, Spanish fallback" stays English.
  const resolved = resolveCoachLocale(tags[0]);
  return resolved !== 'en' ? resolved : null;
}

export const __INTERNALS = { shouldPersistAutoDetected };
