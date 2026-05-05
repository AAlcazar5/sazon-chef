// frontend/__tests__/quality/anyUsage.test.ts
// ROADMAP 4.0 R8 — `any` / `as any` cap. 643 sites at the audit; this caps
// the count so further drift fails CI. Tightening the cap is the unit of
// progress for R8; reducing usage requires per-site judgement (some sites
// are genuinely at boundary types — e.g., axios responses pre-typing pass).

import { execSync } from 'child_process';
import path from 'path';

const FRONTEND = path.resolve(__dirname, '../..');

function anyUsageCount(): number {
  try {
    const out = execSync(
      `grep -rnE "as any|: any\\\\b" ${FRONTEND} --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "__tests__\\|node_modules" || true`,
      { encoding: 'utf-8' },
    );
    if (!out.trim()) return 0;
    return out.trim().split('\n').length;
  } catch {
    return 0;
  }
}

describe('Frontend any usage cap (R8 baseline)', () => {
  it('caps `any` / `as any` at the documented baseline', () => {
    const count = anyUsageCount();
    // R8 baseline was 643. Cap at 660 so trivial new uses pass but the
    // total can't drift up by more than ~3%.
    expect(count).toBeLessThanOrEqual(660);
  });
});
