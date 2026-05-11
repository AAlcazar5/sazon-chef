// U12: Background-task decision audit.
//
// Decision-gate, not code: see frontend/docs/background-tasks-decision.md.
// This test enforces three things:
//   1. The decision doc exists (so we don't lose the rationale).
//   2. The doc explicitly states a "decided" status — no perpetual TBD.
//   3. No `expo-task-manager` or `BackgroundFetch` registrations exist in
//      the app. If someone later adds one, this test fails and forces
//      them to update the decision doc with the new rationale.

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const DOC = path.join(ROOT, 'docs', 'background-tasks-decision.md');

describe('U12: background-task decision', () => {
  it('the decision doc exists', () => {
    expect(existsSync(DOC)).toBe(true);
  });

  it('the decision doc carries a "decided" status, not TBD', () => {
    const src = readFileSync(DOC, 'utf8');
    expect(src).toMatch(/\*\*Status:\*\*\s+decided/i);
    // Force a decision: either "YES" or "NO" must appear in the title block.
    expect(src).toMatch(/decided\s+—\s+\*\*(?:YES|NO)\*\*/i);
  });

  it('no expo-task-manager / BackgroundFetch registrations exist (consistent with the decision)', () => {
    // Grep the app source tree (NOT docs). If a future change introduces a
    // registration, this test fails and forces the author to update the
    // decision doc + reverse the NO call (or update the test allowlist).
    const SCOPES = ['app', 'components', 'lib', 'hooks'];
    const args = SCOPES.map((s) => `"${s}"`).join(' ');
    const out = execSync(
      `find ${args} -type f \\( -name '*.ts' -o -name '*.tsx' \\)`,
      { cwd: ROOT, encoding: 'utf8' },
    );
    const files = out.split('\n').filter(Boolean);
    const offenders: string[] = [];
    for (const rel of files) {
      const abs = path.join(ROOT, rel);
      const src = readFileSync(abs, 'utf8');
      if (
        /\bexpo-task-manager\b/.test(src) ||
        /\bBackgroundFetch\.registerTaskAsync\b/.test(src) ||
        /\bTaskManager\.defineTask\b/.test(src)
      ) {
        offenders.push(rel);
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'Files registering background tasks (decision was NO for v1.0):\n  ' +
          offenders.join('\n  ') +
          '\nUpdate docs/background-tasks-decision.md to record the reversal before re-introducing background fetch.',
      );
    }
    expect(offenders.length).toBe(0);
  });
});
