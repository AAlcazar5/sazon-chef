// frontend/lib/deepLinkRouter.ts
// ROADMAP 4.0 U2 — Deep-link runtime handler.
//
// `app.json` declares `scheme: sazon` but no `Linking` handler existed until
// U2 — every `sazon://...` URL silently no-op'd. This module converts a raw
// URL string (sazon://recipe/abc123, https://sazonchef.app/recipe/abc123)
// into an expo-router target the `_layout.tsx` listener can `router.push()`.
// Unknown / malformed inputs fall through to the Today tab so legacy or
// truncated push payloads can never crash the app.
//
// Pairs with `lib/notificationDeepLink.ts`. The cap test in
// `__tests__/lib/deepLinkRouter.test.ts` enforces: every notification
// template's `pathname` is matched by one of the supported-path matchers
// below.

export interface DeepLinkResolution {
  /** expo-router pathname (already in the form router.push() expects). */
  pathname: string;
  /** Query params parsed off the original URL. */
  params: Record<string, string>;
}

const FALLBACK: DeepLinkResolution = {
  pathname: '/(tabs)',
  params: {},
};

/**
 * U2 regression guard: only treat a URL as a deep link if it matches the
 * brand scheme (`sazon://...`) or our universal-link domain
 * (`https://sazonchef.app` / `https://sazonchef.com`). The Expo dev
 * launcher (`exp://localhost:…`), arbitrary `https://` URLs from
 * external apps, and `null` / garbage all return `false` — pushing
 * them to the resolver's Today fallback caused an infinite remount
 * loop on cold start (every render → `getInitialURL` → fallback →
 * `router.push('/(tabs)')` → re-render).
 *
 * This function is the single source of truth for "is this a deep
 * link the app should react to." Tests pin its behavior so the cold-
 * start loop can't regress.
 */
export function isRecognizedDeepLink(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('sazon://')) return true;
  if (/^https?:\/\/(?:www\.)?sazonchef\.(?:app|com)\b/i.test(url)) return true;
  return false;
}

/**
 * Path matchers for every route the deep-link layer accepts.
 * Each matcher receives the path (without scheme / host / query) and either
 * returns the resolved pathname or null to defer.
 *
 * The order matters — first match wins.
 */
type Matcher = {
  test: RegExp;
  resolve: (match: RegExpMatchArray) => string;
};

const SUPPORTED: Matcher[] = [
  // /recipe/:id
  {
    test: /^\/?recipe\/([^/]+)\/?$/i,
    resolve: (m) => `/recipe/${m[1]}`,
  },
  // /plate/:slug
  {
    test: /^\/?plate\/([^/]+)\/?$/i,
    resolve: (m) => `/plate/${m[1]}`,
  },
  // /build-a-plate
  {
    test: /^\/?build-a-plate\/?$/i,
    resolve: () => '/build-a-plate',
  },
  // /coach → Sazon tab
  {
    test: /^\/?coach\/?$/i,
    resolve: () => '/(tabs)/coach',
  },
  // /kitchen and /cookbook → Kitchen tab
  {
    test: /^\/?(?:kitchen|cookbook)\/?$/i,
    resolve: () => '/(tabs)/cookbook',
  },
  // /week, /meal-plan → Week tab
  {
    test: /^\/?(?:week|meal-plan)\/?$/i,
    resolve: () => '/(tabs)/meal-plan',
  },
  // /today and bare root → Today tab
  {
    test: /^\/?(?:today)?\/?$/i,
    resolve: () => '/(tabs)',
  },
];

/** Strip scheme + host, return `{ path, queryString }` from an arbitrary URL string. */
function splitUrl(raw: string): { path: string; queryString: string } {
  if (!raw || typeof raw !== 'string') return { path: '', queryString: '' };
  // Strip scheme (anything before "://")
  let rest = raw.includes('://') ? raw.split('://').slice(1).join('://') : raw;
  // If a host segment remains (e.g. sazonchef.app/recipe/...), strip up to first '/'
  // BUT scheme-style URLs like sazon://recipe/abc — the part after :// IS the
  // path (no host). Detect by checking for a dot in the first segment.
  const firstSlash = rest.indexOf('/');
  const head = firstSlash === -1 ? rest : rest.slice(0, firstSlash);
  if (head.includes('.')) {
    rest = firstSlash === -1 ? '' : rest.slice(firstSlash);
  } else {
    // sazon://recipe/abc — treat entire remainder as path; prepend '/'
    rest = '/' + rest;
  }
  // Split off query
  const qIdx = rest.indexOf('?');
  if (qIdx === -1) return { path: rest, queryString: '' };
  return { path: rest.slice(0, qIdx), queryString: rest.slice(qIdx + 1) };
}

function parseQuery(qs: string): Record<string, string> {
  if (!qs) return {};
  const out: Record<string, string> = {};
  for (const pair of qs.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq === -1) {
      out[decodeURIComponent(pair)] = '';
    } else {
      const k = decodeURIComponent(pair.slice(0, eq));
      const v = decodeURIComponent(pair.slice(eq + 1));
      out[k] = v;
    }
  }
  return out;
}

/**
 * Resolve a raw deep-link URL into an expo-router target.
 * Unknown / malformed inputs return the Today fallback (never throws).
 */
export function resolveDeepLink(raw: string): DeepLinkResolution {
  if (!raw || typeof raw !== 'string') return FALLBACK;
  const { path, queryString } = splitUrl(raw);
  if (!path) return { ...FALLBACK, params: parseQuery(queryString) };
  for (const matcher of SUPPORTED) {
    const m = path.match(matcher.test);
    if (m) {
      return {
        pathname: matcher.resolve(m),
        params: parseQuery(queryString),
      };
    }
  }
  return { ...FALLBACK, params: parseQuery(queryString) };
}

/**
 * Cap-test export: pathname matchers used to assert every
 * `notificationDeepLink` template lands on a supported route.
 * Pathnames produced by `mapNotificationToDeepLink` are tab-anchored, e.g.
 * `/(tabs)`, `/(tabs)/meal-plan`, `/(tabs)/cookbook` — so the matcher set
 * here mirrors *resolved* pathnames, not raw deep-link paths.
 */
export const __SUPPORTED_PATHS_FOR_TESTS: RegExp[] = [
  /^\/\(tabs\)$/,
  /^\/\(tabs\)\/(meal-plan|cookbook|coach|profile|shopping-list|add)$/,
  /^\/recipe\/[^/]+$/,
  /^\/plate\/[^/]+$/,
  /^\/build-a-plate$/,
];
