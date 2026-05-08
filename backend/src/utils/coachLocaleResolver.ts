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
}

/**
 * Resolve the locale for a coach turn. Walks the priority chain.
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
    // to the header so we can recover. Persist auto-detection is a separate
    // concern for the caller.
  }
  // 2. Accept-Language chain
  const tags = parseAcceptLanguage(input.acceptLanguageHeader);
  for (const tag of tags) {
    const resolved = resolveCoachLocale(tag);
    if (resolved !== 'en') return resolved;
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
  for (const tag of tags) {
    const resolved = resolveCoachLocale(tag);
    if (resolved !== 'en') return resolved;
  }
  return null;
}

export const __INTERNALS = { shouldPersistAutoDetected };
