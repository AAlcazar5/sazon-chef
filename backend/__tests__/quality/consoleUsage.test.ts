// backend/__tests__/quality/consoleUsage.test.ts
// ROADMAP 4.0 E8 — backend `console.*` is FORBIDDEN in `backend/src/**`.
// The R7 cap (≤750) was the holding pattern; E8 completes the sweep — all
// loggers route through pino (`src/utils/logger.ts`) so events get PII
// redaction + structured fields. CI fails if any new `console.*` lands.

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

describe('Backend console.* (E8 — zero baseline)', () => {
  it('forbids console.* in backend/src — use logger from utils/logger', () => {
    const count = consoleCallCount();
    expect(count).toBe(0);
  });
});
