// U16: Alert.alert i18n ratchet.
//
// Audit on 2026-05-11 found 161 raw `Alert.alert('title', 'body')` calls
// that bypass the i18n `t()` helper. Spanish / Portuguese / French users
// would see English alerts. U16 introduces `sazonAlert(titleKey, bodyKey)`
// + `sazonAlertRaw(title, body)` from `lib/sazonAlert.ts`, and pins a
// ratchet at the current count. Every PR must lower it (or hold).

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SCOPES = ['app', 'components', 'hooks'];

// Pin the floor (post-U16 initial sweep). Only ever decrease.
// Inclusive of multi-line `Alert.alert(\n  'title', ...)` calls that the
// audit-time `grep -E "Alert\.alert\(['\"]"` missed — true number is ~210.
//
// 2026-05-13 — brand-voice batch 1 migrated ~37 `Failed to ...` Alert.alert
// sites across useShoppingList, useMealPlanActions, useProfileData,
// useRecipeActions, useCollectionSave, useMealSwap, useFilterActions to
// sazonAlert(...) with new generic on-brand keys. Floor 208 → 171.
const RATCHET_MAX_RAW_ALERTS = 171;

const ALERT_LITERAL_RE = /Alert\.alert\(\s*['"`]/g;

const ALLOWLIST = new Set<string>([
  // The wrapper itself uses Alert.alert internally.
  path.join(ROOT, 'lib', 'sazonAlert.ts'),
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

describe('U16: Alert.alert i18n coverage', () => {
  it(`raw Alert.alert literals across app|components|hooks ≤ ${RATCHET_MAX_RAW_ALERTS}`, () => {
    const files = listFiles();
    let total = 0;
    const perFile: Array<{ file: string; n: number }> = [];
    for (const f of files) {
      if (ALLOWLIST.has(f)) continue;
      if (f.includes('__tests__')) continue;
      const src = readFileSync(f, 'utf8');
      const matches = src.match(ALERT_LITERAL_RE);
      const n = matches ? matches.length : 0;
      if (n > 0) {
        total += n;
        perFile.push({ file: path.relative(ROOT, f), n });
      }
    }
    if (total > RATCHET_MAX_RAW_ALERTS) {
      const top = perFile.sort((a, b) => b.n - a.n).slice(0, 10);
      throw new Error(
        `Alert.alert ratchet broken: ${total} > ${RATCHET_MAX_RAW_ALERTS}\nTop offenders:\n` +
          top.map((t) => `  ${t.n}  ${t.file}`).join('\n') +
          "\nReplace with `sazonAlert('alerts.foo.title', 'alerts.foo.body')` from lib/sazonAlert.ts.",
      );
    }
    expect(total).toBeLessThanOrEqual(RATCHET_MAX_RAW_ALERTS);
  });

  it('sazonAlert wrapper exports both translated + raw forms', () => {
    const src = readFileSync(path.join(ROOT, 'lib', 'sazonAlert.ts'), 'utf8');
    expect(src).toMatch(/export\s+function\s+sazonAlert\b/);
    expect(src).toMatch(/export\s+function\s+sazonAlertRaw\b/);
    expect(src).toMatch(/from\s+['"]\.\/i18n['"]/);
  });
});
