// U5: Event-listener cleanup audit.
//
// Audit on 2026-05-11 surfaced 9 `addEventListener` / `addListener` callsites
// against only 2 literal `removeEventListener` calls — the lopsided ratio
// suggested leaked subscriptions across screen unmount. On a closer pass
// every file actually does clean up via the modern `subscription.remove()`
// pattern (RN deprecated `removeEventListener` years ago), so the ratchet
// just locks the invariant: every file that registers a listener must
// also contain a remove pattern AND a `useEffect` cleanup return.

import { execSync } from 'child_process';
import path from 'path';
import { readFileSync } from 'fs';

const ROOT = path.resolve(__dirname, '../..');
const SCOPES = ['app', 'components', 'lib', 'hooks'];

// Matches: `addEventListener(`, `.addListener(`. Captures both RN's
// subscription-returning APIs (AppState, AccessibilityInfo, Linking, Keyboard)
// and Animated.Value's listener API. False positives on `react-query`'s
// subscription helpers are deliberately excluded by anchoring on `addListener(`
// or `addEventListener(` rather than the bare word.
const REGISTER_RE = /\b(?:addEventListener|addListener)\s*\(/;

// A file is considered "cleanup-complete" if it contains BOTH:
//   - a remove pattern: `.remove()`, `removeListener`, or `unsubscribe`
//   - a `useEffect` cleanup return (`return () =>`) or a top-level cleanup
//     return inside an effect.
// We don't try to match registrations to removals one-to-one — the static
// check is necessarily loose, but a file that registers listeners and has
// zero remove patterns is a near-certain leak.
const REMOVE_RE = /(?:\.remove\s*\(|removeListener|removeEventListener|unsubscribe\b)/;
const CLEANUP_RETURN_RE = /return\s*\(\s*\)\s*=>/;

function listFiles(): string[] {
  const args = SCOPES.map((s) => `"${s}"`).join(' ');
  const out = execSync(
    `find ${args} -type f \\( -name '*.ts' -o -name '*.tsx' \\)`,
    { cwd: ROOT, encoding: 'utf8' },
  );
  return out
    .split('\n')
    .filter(Boolean)
    .map((f) => path.join(ROOT, f));
}

describe('U5: event-listener cleanup', () => {
  it('every file that registers a listener also has a remove pattern AND a useEffect cleanup return', () => {
    const offenders: string[] = [];
    for (const f of listFiles()) {
      const src = readFileSync(f, 'utf8');
      if (!REGISTER_RE.test(src)) continue;
      const hasRemove = REMOVE_RE.test(src);
      const hasCleanupReturn = CLEANUP_RETURN_RE.test(src);
      if (!hasRemove || !hasCleanupReturn) {
        offenders.push(
          `${path.relative(ROOT, f)} (remove=${hasRemove}, cleanupReturn=${hasCleanupReturn})`,
        );
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'Files registering listeners without paired cleanup:\n  ' +
          offenders.join('\n  ') +
          '\nEvery registration must have a `subscription.remove()` (or equivalent) in a `useEffect` cleanup return.',
      );
    }
    expect(offenders.length).toBe(0);
  });
});
