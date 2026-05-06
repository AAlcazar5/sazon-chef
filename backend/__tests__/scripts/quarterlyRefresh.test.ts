// ROADMAP 4.0 TB0.4 — Quarterly refresh job test.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  runQuarterlyRefresh,
  RefreshResult,
} from '../../scripts/recommender/quarterlyRefresh';

describe('runQuarterlyRefresh', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('writes a structured report and returns a summary', async () => {
    const ingest = jest.fn(async () => ({
      recipesKept: 100,
      recipesDropped: 20,
      interactionsKept: 1234,
      interactionsDropped: 56,
      outputPath: path.join(tmp, 'food_com_interactions.json'),
    }));
    const align = jest.fn(async () => ({
      matched: 80,
      fallback: 15,
      unmatched: 5,
      skipped: 0,
    }));
    const tokenCostUSD = jest.fn(() => 0.0123);

    const result: RefreshResult = await runQuarterlyRefresh({
      reportDir: tmp,
      ingest,
      align,
      tokenCostUSD,
      now: new Date('2026-05-05T10:00:00Z'),
    });

    expect(result.matched).toBe(80);
    expect(result.fallback).toBe(15);
    expect(result.tokenCostUSD).toBeCloseTo(0.0123, 4);
    expect(ingest).toHaveBeenCalled();
    expect(align).toHaveBeenCalled();

    const reportPath = path.join(tmp, 'recommender-refresh-2026-05-05.json');
    expect(fs.existsSync(reportPath)).toBe(true);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report.matched).toBe(80);
    expect(report.recipesKept).toBe(100);
  });

  it('logs failure and re-throws if alignment errors', async () => {
    const ingest = jest.fn(async () => ({
      recipesKept: 0,
      recipesDropped: 0,
      interactionsKept: 0,
      interactionsDropped: 0,
      outputPath: tmp,
    }));
    const align = jest.fn(async () => {
      throw new Error('boom');
    });
    await expect(
      runQuarterlyRefresh({
        reportDir: tmp,
        ingest,
        align,
        now: new Date('2026-05-05T10:00:00Z'),
      }),
    ).rejects.toThrow('boom');
    const reportPath = path.join(tmp, 'recommender-refresh-2026-05-05.json');
    expect(fs.existsSync(reportPath)).toBe(true);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report.error).toBe('boom');
  });
});
