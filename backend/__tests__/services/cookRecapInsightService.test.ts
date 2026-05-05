// backend/__tests__/services/cookRecapInsightService.test.ts
// ROADMAP 4.0 Tier J16 — Auto-generated cook recap line (TDD).
// Sourced from .context/decisions/accepted/P-004-auto-generated-cook-recap-line.md.

import { computeCookRecapInsight } from '../../src/services/cookRecapInsightService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.cookingLog) {
    mockPrisma.cookingLog = { count: jest.fn(), findMany: jest.fn() };
  } else {
    mockPrisma.cookingLog.count = jest.fn();
    mockPrisma.cookingLog.findMany = jest.fn();
  }
});

describe('computeCookRecapInsight', () => {
  it('returns the cuisine-count line when this is the third Persian dish this month', async () => {
    // Two prior Persian cooks within the last 30 days, BOTH in the same ISO week
    // so the streak signal does not pre-empt the monthly-count line.
    // Apr 20 (Mon) and Apr 24 (Fri) both sit in week-of-Apr-20.
    // Current cook May 5 (Tue) sits in week-of-May-04 → only weeks {Apr 20, May 04}
    // → no 3-week streak.
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Persian' }, cookedAt: new Date('2026-04-20T12:00:00Z') },
      { recipe: { cuisine: 'Persian' }, cookedAt: new Date('2026-04-24T12:00:00Z') },
    ]);

    const insight = await computeCookRecapInsight({
      userId: 'u1',
      cuisine: 'Persian',
      asOfDate: new Date('2026-05-05T12:00:00Z'),
    });

    expect(insight).toMatch(/third/i);
    expect(insight).toMatch(/persian/i);
    expect(insight).toMatch(/month/i);
  });

  it('returns the consecutive-weeks-streak line when the user has cooked the cuisine for 3 weeks running', async () => {
    // One cook in each of the prior two ISO weeks PLUS the current week (this cook).
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Lebanese' }, cookedAt: new Date('2026-04-22T12:00:00Z') }, // wk -2
      { recipe: { cuisine: 'Lebanese' }, cookedAt: new Date('2026-04-29T12:00:00Z') }, // wk -1
    ]);

    const insight = await computeCookRecapInsight({
      userId: 'u1',
      cuisine: 'Lebanese',
      asOfDate: new Date('2026-05-06T12:00:00Z'),
    });

    expect(insight).toMatch(/lebanese/i);
    expect(insight).toMatch(/(week|row)/i);
    expect(insight).toMatch(/third|three|3rd/i);
  });

  it('prefers the streak line over the monthly-count line when both apply', async () => {
    // 3-week streak AND ≥2 cooks this month — streak should win for being the rarer signal.
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Persian' }, cookedAt: new Date('2026-04-22T12:00:00Z') },
      { recipe: { cuisine: 'Persian' }, cookedAt: new Date('2026-04-29T12:00:00Z') },
    ]);

    const insight = await computeCookRecapInsight({
      userId: 'u1',
      cuisine: 'Persian',
      asOfDate: new Date('2026-05-06T12:00:00Z'),
    });

    expect(insight).toMatch(/(week|row)/i);
  });

  it('returns null when no insight applies (single-cook, no history)', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([]);

    const insight = await computeCookRecapInsight({
      userId: 'u1',
      cuisine: 'Persian',
      asOfDate: new Date('2026-05-05T12:00:00Z'),
    });

    expect(insight).toBeNull();
  });

  it('returns null on missing userId (safe default)', async () => {
    const insight = await computeCookRecapInsight({
      userId: '',
      cuisine: 'Persian',
      asOfDate: new Date(),
    });
    expect(insight).toBeNull();
  });

  it('returns null on empty cuisine', async () => {
    const insight = await computeCookRecapInsight({
      userId: 'u1',
      cuisine: '',
      asOfDate: new Date(),
    });
    expect(insight).toBeNull();
  });

  it('never returns more than one line', async () => {
    // Stress: lots of prior cooks, all matching, all eligible signals.
    mockPrisma.cookingLog.findMany.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({
        recipe: { cuisine: 'Persian' },
        cookedAt: new Date(`2026-04-${String(15 + i).padStart(2, '0')}T12:00:00Z`),
      })),
    );

    const insight = await computeCookRecapInsight({
      userId: 'u1',
      cuisine: 'Persian',
      asOfDate: new Date('2026-05-05T12:00:00Z'),
    });

    expect(insight).not.toBeNull();
    expect(insight!.split('\n').length).toBe(1);
  });

  it('is case-insensitive on cuisine matching', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'persian' }, cookedAt: new Date('2026-04-20T12:00:00Z') }, // lowercase prior
      { recipe: { cuisine: 'PERSIAN' }, cookedAt: new Date('2026-04-28T12:00:00Z') }, // uppercase prior
    ]);

    const insight = await computeCookRecapInsight({
      userId: 'u1',
      cuisine: 'Persian',
      asOfDate: new Date('2026-05-05T12:00:00Z'),
    });

    // Two prior + this one = third → monthly-count line
    expect(insight).toMatch(/third/i);
  });

  it('does not count cooks older than 30 days for the monthly line', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      // Two old cooks (>30d) — should not contribute
      { recipe: { cuisine: 'Persian' }, cookedAt: new Date('2026-03-01T12:00:00Z') },
      { recipe: { cuisine: 'Persian' }, cookedAt: new Date('2026-03-15T12:00:00Z') },
    ]);

    const insight = await computeCookRecapInsight({
      userId: 'u1',
      cuisine: 'Persian',
      asOfDate: new Date('2026-05-05T12:00:00Z'),
    });

    // No prior cooks in the last 30d, no streak → null
    expect(insight).toBeNull();
  });
});
