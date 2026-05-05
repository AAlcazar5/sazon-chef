// frontend/__tests__/quality/refactorBaseline.test.ts
// ROADMAP 4.0 R13 — Verifies the refactor-baseline script loads + exposes a
// snapshot builder. Doesn't actually run the script (it shells out to tsc +
// jest) — that runs in a cron / GitHub Action.

import path from 'path';
import fs from 'fs';

const SCRIPT_PATH = path.resolve(__dirname, '../../../scripts/refactor-baseline.js');

describe('refactor-baseline script', () => {
  it('exists at scripts/refactor-baseline.js', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
  });

  it('exports a buildSnapshot function', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(SCRIPT_PATH);
    expect(typeof mod.buildSnapshot).toBe('function');
  });

  it('is a CommonJS module (callable from cron without ts-node)', () => {
    const source = fs.readFileSync(SCRIPT_PATH, 'utf-8');
    expect(source).toContain("'use strict'");
    expect(source).toContain('module.exports');
  });
});
