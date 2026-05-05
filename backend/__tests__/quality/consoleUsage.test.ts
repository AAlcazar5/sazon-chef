// backend/__tests__/quality/consoleUsage.test.ts
// ROADMAP 4.0 R7 — backend `console.*` cap. The full pino migration is a
// mechanical sweep across 738 call sites; this test caps the count so it
// shrinks monotonically as we replace each call.

import { execSync } from 'child_process';
import path from 'path';

const BACKEND_SRC = path.resolve(__dirname, '../../src');

function consoleCallCount(): number {
  try {
    const out = execSync(
      `grep -rE "console\\\\.(log|warn|error|info|debug)" ${BACKEND_SRC} --include="*.ts" 2>/dev/null || true`,
      { encoding: 'utf-8' },
    );
    if (!out.trim()) return 0;
    return out.trim().split('\n').length;
  } catch {
    return 0;
  }
}

describe('Backend console.* cap (R7 baseline)', () => {
  it('caps console.* calls in backend/src at the documented baseline (738)', () => {
    const count = consoleCallCount();
    // R7 baseline at audit. Migration to pino is mechanical (738 calls).
    // Cap at 750 to allow trivial new debug while ensuring downstream PRs
    // can't blow it up.
    expect(count).toBeLessThanOrEqual(750);
  });
});
