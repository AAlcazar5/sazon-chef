// U23: Timer pairing ratchet.
//
// Audit on 2026-05-11 surfaced 14 files calling `setTimeout` / `setInterval`
// with no matching `clear*` in the same file. Most are setTimeout-once
// patterns (animation reveals, debounced inputs, optimistic UI) that
// don't need clears — firing once and letting the component unmount is
// fine. But `setInterval` ALWAYS needs a paired `clearInterval` (or it
// keeps firing after unmount, leaking memory + state updates on
// unmounted components).
//
// This ratchet enforces: every file with `setInterval(callback, ms)` must
// also have `clearInterval(...)` in the same file.

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SCOPES = ['app', 'components', 'lib', 'hooks'];

// Files where the bare token "setInterval" appears but is NOT the global
// — e.g. a useState setter literally named `setInterval`. Allowlisted so
// the ratchet doesn't false-positive on a destructure pattern.
const ALLOWLIST = new Set<string>([
  // `const [interval, setInterval] = useState<'month'|'year'>(...)` — the
  // setter shares the global's name but is a state mutator, not a timer.
  'components/premium/PaywallScreen.tsx',
]);

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

// Match the global setInterval pattern: setInterval followed by `(` and
// either an arrow `()=>...`, `function`, or an identifier callback.
// Catches the leak-prone form; ignores useState destructure where
// setInterval is just a setter name (the line is usually `setInterval(<string>)`).
const GLOBAL_SETINTERVAL_RE = /\bsetInterval\s*\(\s*(?:function|\(|async|[a-zA-Z_$][\w$]*\s*[,)])/;
const CLEARINTERVAL_RE = /\bclearInterval\s*\(/;

describe('U23: setInterval pairing', () => {
  it('every file that calls global setInterval also calls clearInterval', () => {
    const offenders: string[] = [];
    for (const f of listFiles()) {
      const rel = path.relative(ROOT, f);
      if (ALLOWLIST.has(rel)) continue;
      const src = readFileSync(f, 'utf8');
      if (GLOBAL_SETINTERVAL_RE.test(src) && !CLEARINTERVAL_RE.test(src)) {
        offenders.push(rel);
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'Files calling setInterval without a matching clearInterval:\n  ' +
          offenders.join('\n  ') +
          '\nReturn a cleanup from the useEffect that registers the interval, or call clearInterval explicitly.',
      );
    }
    expect(offenders.length).toBe(0);
  });
});
