// backend/__tests__/services/selfImprovement/measurement.test.ts
// Tier M5 — monthly measurement loop tests.

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  appendLedgerRow,
  classifyOutcome,
  formatDelta,
  MetricObservation,
  MetricProvider,
  renderDigest,
  runMonthlyMeasurement,
  ShippedProposal,
} from '../../../src/services/selfImprovement/measurementService';

const proposal: ShippedProposal = {
  proposalId: 'P-001',
  slug: 'sazon-wrapped-yearly',
  sourceFeed: 'inspiration',
  targetMetric: 'share',
  shippedAt: new Date('2026-04-10T00:00:00Z'),
};

function tmpRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sazon-measure-'));
  fs.mkdirSync(path.join(root, '.context', 'learnings'), { recursive: true });
  return root;
}

describe('M5 — classifyOutcome', () => {
  it('tags ≥10% lift as win when no guardrail regression', () => {
    expect(
      classifyOutcome({ baseline: 100, result: 120, windowDays: 30, sampleSize: 1000 }),
    ).toBe('win');
  });
  it('tags ≤−5% drop as regression', () => {
    expect(
      classifyOutcome({ baseline: 100, result: 90, windowDays: 30, sampleSize: 1000 }),
    ).toBe('regression');
  });
  it('tags ±5% as null', () => {
    expect(
      classifyOutcome({ baseline: 100, result: 102, windowDays: 30, sampleSize: 1000 }),
    ).toBe('null');
  });
  it('tags small sample as inconclusive', () => {
    expect(
      classifyOutcome({ baseline: 100, result: 200, windowDays: 30, sampleSize: 5 }),
    ).toBe('inconclusive');
  });
  it('tags guardrail regression as regression', () => {
    expect(
      classifyOutcome({
        baseline: 100,
        result: 200,
        windowDays: 30,
        sampleSize: 1000,
        guardrailRegressed: true,
      }),
    ).toBe('regression');
  });
});

describe('M5 — formatDelta', () => {
  it('formats positive delta with sign', () => {
    expect(formatDelta({ baseline: 100, result: 120, windowDays: 30 })).toBe('+20.0%');
  });
  it('formats negative delta', () => {
    expect(formatDelta({ baseline: 100, result: 90, windowDays: 30 })).toBe('-10.0%');
  });
});

describe('M5 — appendLedgerRow', () => {
  it('creates ledger header on first call and appends thereafter', () => {
    const root = tmpRoot();
    const fp = path.join(root, '.context', 'learnings', 'proposals-outcomes.md');
    appendLedgerRow(
      fp,
      proposal,
      { baseline: 100, result: 120, windowDays: 30 },
      'win',
    );
    appendLedgerRow(
      fp,
      { ...proposal, proposalId: 'P-002', slug: 'b' },
      { baseline: 50, result: 60, windowDays: 30 },
      'win',
    );
    const body = fs.readFileSync(fp, 'utf-8');
    expect(body).toMatch(/Proposals — Outcomes Ledger/);
    expect(body.split('\n').filter((l) => /\| P-/.test(l))).toHaveLength(2);
  });
});

describe('M5 — renderDigest', () => {
  it('emits per-tag counts in frontmatter', () => {
    const md = renderDigest(
      [
        {
          proposal,
          tag: 'win',
          obs: { baseline: 100, result: 120, windowDays: 30 },
        },
        {
          proposal: { ...proposal, proposalId: 'P-002', slug: 'b' },
          tag: 'regression',
          obs: { baseline: 100, result: 80, windowDays: 30 },
        },
      ],
      '2026-05',
    );
    expect(md).toMatch(/proposals_measured: 2/);
    expect(md).toMatch(/wins: 1/);
    expect(md).toMatch(/regressions: 1/);
  });
});

describe('M5 — runMonthlyMeasurement', () => {
  beforeEach(() => {
    delete process.env.SELF_IMPROVEMENT_ENGINE_ENABLED;
  });

  it('appends one row per shipped proposal with metric data and writes a digest', async () => {
    const root = tmpRoot();
    const provider: MetricProvider = {
      fetch: async () => ({ baseline: 100, result: 130, windowDays: 30, sampleSize: 1000 }),
    };
    const result = await runMonthlyMeasurement({
      metricProvider: provider,
      shippedProposals: [
        proposal,
        { ...proposal, proposalId: 'P-002', slug: 'b' },
      ],
      contextRoot: path.join(root, '.context'),
      now: () => new Date('2026-05-01T00:00:00Z'),
    });
    expect(result.status).toBe('ok');
    expect(result.appended).toBe(2);
    expect(fs.existsSync(result.digestPath!)).toBe(true);
    expect(fs.existsSync(result.ledgerPath!)).toBe(true);
    const ledger = fs.readFileSync(result.ledgerPath!, 'utf-8');
    expect(ledger.split('\n').filter((l) => /\| P-/.test(l))).toHaveLength(2);
  });

  it('skips proposals when provider returns null', async () => {
    const root = tmpRoot();
    const provider: MetricProvider = { fetch: async () => null };
    const result = await runMonthlyMeasurement({
      metricProvider: provider,
      shippedProposals: [proposal],
      contextRoot: path.join(root, '.context'),
      now: () => new Date('2026-05-01T00:00:00Z'),
    });
    expect(result.appended).toBe(0);
  });

  it('returns no-shipped when there is nothing to measure', async () => {
    const root = tmpRoot();
    const provider: MetricProvider = {
      fetch: async () => ({ baseline: 0, result: 0, windowDays: 30 }),
    };
    const result = await runMonthlyMeasurement({
      metricProvider: provider,
      shippedProposals: [],
      contextRoot: path.join(root, '.context'),
      now: () => new Date('2026-05-01T00:00:00Z'),
    });
    expect(result.status).toBe('no-shipped');
    expect(result.appended).toBe(0);
  });

  it('multiple runs append (do not overwrite) ledger rows', async () => {
    const root = tmpRoot();
    const provider: MetricProvider = {
      fetch: async () => ({ baseline: 100, result: 110, windowDays: 30, sampleSize: 1000 }),
    };
    const r1 = await runMonthlyMeasurement({
      metricProvider: provider,
      shippedProposals: [proposal],
      contextRoot: path.join(root, '.context'),
      now: () => new Date('2026-05-01T00:00:00Z'),
    });
    const r2 = await runMonthlyMeasurement({
      metricProvider: provider,
      shippedProposals: [{ ...proposal, proposalId: 'P-002', slug: 'b' }],
      contextRoot: path.join(root, '.context'),
      now: () => new Date('2026-06-01T00:00:00Z'),
    });
    expect(r1.appended).toBe(1);
    expect(r2.appended).toBe(1);
    const ledger = fs.readFileSync(r2.ledgerPath!, 'utf-8');
    expect(ledger.split('\n').filter((l) => /\| P-/.test(l))).toHaveLength(2);
  });
});
