// ROADMAP 4.0 TB3.3 — Weekly accuracy dashboard test.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { prisma } from '../../src/lib/prisma';
import {
  weeklyRecommenderReport,
  formatWeeklyReport,
} from '../../scripts/recommender/weeklyReport';

const findMany = jest.fn();
(prisma as any).recommenderEvent = {
  ...((prisma as any).recommenderEvent ?? {}),
  findMany,
};

function makeEvent(overrides: any = {}) {
  return {
    id: overrides.id ?? 'evt',
    confidence: 0.8,
    source: 'llm',
    pickedRecipeId: 'r1',
    outcome: null,
    ...overrides,
  };
}

describe('weeklyRecommenderReport (TB3.3)', () => {
  beforeEach(() => findMany.mockReset());

  it('computes acceptance / swap / escape / fallback rates', async () => {
    findMany.mockResolvedValue([
      makeEvent({ id: 'a', outcome: { outcome: 'accepted' } }),
      makeEvent({ id: 'b', outcome: { outcome: 'accepted' } }),
      makeEvent({ id: 'c', outcome: { outcome: 'swapped' } }),
      makeEvent({ id: 'd', outcome: { outcome: 'escaped' } }),
      makeEvent({ id: 'e', outcome: null, confidence: 0.4 }),
      makeEvent({ id: 'f', source: 'retrieval_fallback' }),
    ]);
    const report = await weeklyRecommenderReport({
      weekStart: new Date('2026-04-28T00:00:00Z'),
      weekEnd: new Date('2026-05-05T00:00:00Z'),
    });
    expect(report.totalProposals).toBe(6);
    expect(report.acceptanceRate).toBeCloseTo(2 / 6, 3);
    expect(report.swapThenAcceptRate).toBeCloseTo(1 / 6, 3);
    expect(report.escapeRate).toBeCloseTo(1 / 6, 3);
    expect(report.fallbackRate).toBeCloseTo(1 / 6, 3);
    expect(report.lowConfidenceRate).toBeCloseTo(1 / 6, 3);
  });

  it('handles empty week without dividing by zero', async () => {
    findMany.mockResolvedValue([]);
    const report = await weeklyRecommenderReport({
      weekStart: new Date('2026-04-28T00:00:00Z'),
      weekEnd: new Date('2026-05-05T00:00:00Z'),
    });
    expect(report.totalProposals).toBe(0);
    expect(report.acceptanceRate).toBe(0);
    expect(report.fallbackRate).toBe(0);
  });

  it('formats markdown report and writes it to disk', async () => {
    findMany.mockResolvedValue([
      makeEvent({ id: 'a', outcome: { outcome: 'accepted' } }),
    ]);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tb33-'));
    try {
      const report = await weeklyRecommenderReport({
        weekStart: new Date('2026-04-28T00:00:00Z'),
        weekEnd: new Date('2026-05-05T00:00:00Z'),
        outputDir: tmp,
      });
      const file = path.join(tmp, 'recommender-weekly.md');
      expect(fs.existsSync(file)).toBe(true);
      const md = fs.readFileSync(file, 'utf8');
      expect(md).toContain('Acceptance');
      expect(formatWeeklyReport(report)).toContain('Acceptance');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
