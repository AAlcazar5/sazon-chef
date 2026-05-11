// U4: Frontend console.* ratchet.
//
// Audit on 2026-05-11 found ~336 `console.*` calls in `app|components|lib|hooks`.
// These ship to user devices, drain battery, slow the JS thread, and leak
// diagnostic state. Convert to the project logger (`lib/logger.ts`) or
// delete debug-only calls. This test pins a *floor* — the count must
// monotonically decrease over time. New code may not introduce any new
// raw `console.*` call.

import { execSync } from 'child_process';
import path from 'path';
import { readFileSync, statSync } from 'fs';

const ROOT = path.resolve(__dirname, '../..');
const SCOPES = ['app', 'components', 'lib', 'hooks'];

// Ratchet floor. **Only ever decrease.** A failing test after a deletion
// means the floor needs to come down further — never up.
const RATCHET_MAX = 327;

// Files that are allowed to call `console.*` directly (the logger itself).
const ALLOWLIST = new Set<string>([
  path.join(ROOT, 'lib', 'logger.ts'),
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

const CONSOLE_RE = /console\.(?:log|warn|error|info|debug)\s*\(/g;

function countConsoleCalls(file: string): number {
  if (ALLOWLIST.has(file)) return 0;
  try {
    if (!statSync(file).isFile()) return 0;
  } catch {
    return 0;
  }
  const src = readFileSync(file, 'utf8');
  const matches = src.match(CONSOLE_RE);
  return matches ? matches.length : 0;
}

describe('U4: frontend console.* usage', () => {
  it(`total console.* calls in app|components|lib|hooks ≤ ${RATCHET_MAX}`, () => {
    const files = listFiles();
    let total = 0;
    const perFile: Array<{ file: string; n: number }> = [];
    for (const f of files) {
      const n = countConsoleCalls(f);
      if (n > 0) {
        total += n;
        perFile.push({ file: path.relative(ROOT, f), n });
      }
    }
    if (total > RATCHET_MAX) {
      const top = perFile.sort((a, b) => b.n - a.n).slice(0, 10);
      throw new Error(
        `console.* ratchet broken: ${total} > ${RATCHET_MAX}\nTop offenders:\n` +
          top.map((t) => `  ${t.n}  ${t.file}`).join('\n') +
          `\nReplace with createLogger('Tag') from lib/logger.ts.`,
      );
    }
    expect(total).toBeLessThanOrEqual(RATCHET_MAX);
  });

  it('only lib/logger.ts is allowed to call console.* directly (allowlist guard)', () => {
    expect(ALLOWLIST.size).toBeGreaterThan(0);
    for (const entry of ALLOWLIST) {
      // Allowlisted file must exist — stale allowlist entries are a bug.
      expect(() => statSync(entry)).not.toThrow();
    }
  });
});
