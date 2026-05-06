// backend/__tests__/services/culturalFluencyInsightService.test.ts
// ROADMAP 4.0 Tier J17.1 — Stories/Journey weekly cultural-fluency beat (TDD).
//
// The service surfaces a 1-card "why this works" insight tied to the cuisine
// the user has cooked most this week. Templated, NOT AI. Returns null when
// the user has cooked <3 times in the last 7 days. Banned-vocab regression
// must hold across every templated string the service can emit.

import { generateWeeklyInsight } from '../../src/services/culturalFluencyInsightService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.cookingLog) {
    mockPrisma.cookingLog = { findMany: jest.fn() };
  } else {
    mockPrisma.cookingLog.findMany = jest.fn();
  }
});

describe('generateWeeklyInsight', () => {
  it('returns an insight tied to the most-cooked cuisine of the week', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Japanese' }, cookedAt: new Date('2026-05-01T12:00:00Z') },
      { recipe: { cuisine: 'Japanese' }, cookedAt: new Date('2026-05-02T12:00:00Z') },
      { recipe: { cuisine: 'Japanese' }, cookedAt: new Date('2026-05-04T12:00:00Z') },
      { recipe: { cuisine: 'Italian' }, cookedAt: new Date('2026-05-03T12:00:00Z') },
    ]);

    const result = await generateWeeklyInsight({
      userId: 'u1',
      asOfDate: new Date('2026-05-06T12:00:00Z'),
    });

    expect(result).not.toBeNull();
    expect(result!.cuisine.toLowerCase()).toBe('japanese');
    expect(result!.insight).toMatch(/japanese/i);
    expect(result!.insight.length).toBeGreaterThan(0);
  });

  it('returns null when the user has fewer than 3 cooks in the week', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Japanese' }, cookedAt: new Date('2026-05-01T12:00:00Z') },
      { recipe: { cuisine: 'Japanese' }, cookedAt: new Date('2026-05-02T12:00:00Z') },
    ]);

    const result = await generateWeeklyInsight({
      userId: 'u1',
      asOfDate: new Date('2026-05-06T12:00:00Z'),
    });

    expect(result).toBeNull();
  });

  it('returns null when the user has no cooks in the week', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([]);

    const result = await generateWeeklyInsight({
      userId: 'u1',
      asOfDate: new Date('2026-05-06T12:00:00Z'),
    });

    expect(result).toBeNull();
  });

  it('returns null when userId is missing', async () => {
    const result = await generateWeeklyInsight({
      userId: '',
      asOfDate: new Date('2026-05-06T12:00:00Z'),
    });

    expect(result).toBeNull();
  });

  it('picks the most-cooked cuisine when multiple cuisines tie above threshold', async () => {
    // 3 Korean, 3 Mexican — most-frequent tie. Stable ordering: first by count
    // desc, then alphabetical.
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Korean' }, cookedAt: new Date('2026-05-01T12:00:00Z') },
      { recipe: { cuisine: 'Korean' }, cookedAt: new Date('2026-05-02T12:00:00Z') },
      { recipe: { cuisine: 'Korean' }, cookedAt: new Date('2026-05-03T12:00:00Z') },
      { recipe: { cuisine: 'Mexican' }, cookedAt: new Date('2026-05-01T12:00:00Z') },
      { recipe: { cuisine: 'Mexican' }, cookedAt: new Date('2026-05-04T12:00:00Z') },
      { recipe: { cuisine: 'Mexican' }, cookedAt: new Date('2026-05-05T12:00:00Z') },
    ]);

    const result = await generateWeeklyInsight({
      userId: 'u1',
      asOfDate: new Date('2026-05-06T12:00:00Z'),
    });

    expect(result).not.toBeNull();
    expect(['korean', 'mexican']).toContain(result!.cuisine.toLowerCase());
  });

  it('returns a generic insight for cuisines without a curated template', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Bhutanese' }, cookedAt: new Date('2026-05-01T12:00:00Z') },
      { recipe: { cuisine: 'Bhutanese' }, cookedAt: new Date('2026-05-02T12:00:00Z') },
      { recipe: { cuisine: 'Bhutanese' }, cookedAt: new Date('2026-05-03T12:00:00Z') },
    ]);

    const result = await generateWeeklyInsight({
      userId: 'u1',
      asOfDate: new Date('2026-05-06T12:00:00Z'),
    });

    expect(result).not.toBeNull();
    expect(result!.cuisine.toLowerCase()).toBe('bhutanese');
    expect(result!.insight).toMatch(/bhutanese/i);
  });

  it('skips rows with null cuisines without crashing', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: null, cookedAt: new Date('2026-05-01T12:00:00Z') },
      { recipe: { cuisine: null }, cookedAt: new Date('2026-05-02T12:00:00Z') },
      { recipe: { cuisine: 'Greek' }, cookedAt: new Date('2026-05-03T12:00:00Z') },
      { recipe: { cuisine: 'Greek' }, cookedAt: new Date('2026-05-04T12:00:00Z') },
      { recipe: { cuisine: 'Greek' }, cookedAt: new Date('2026-05-05T12:00:00Z') },
    ]);

    const result = await generateWeeklyInsight({
      userId: 'u1',
      asOfDate: new Date('2026-05-06T12:00:00Z'),
    });

    expect(result).not.toBeNull();
    expect(result!.cuisine.toLowerCase()).toBe('greek');
  });
});

describe('generateWeeklyInsight — banned-vocab regression', () => {
  // Persona-loaded banned terms for J17/J18: any health-prescriptive framing
  // is failure mode. The service must never emit any of these strings —
  // word-boundary match because "less" or "fat" inside other words is fine
  // (e.g. "Greek").
  const BANNED = [
    'weight',
    'lose',
    'healthy alternative',
    'instead of',
    'less than',
    'guilt-free',
    'skinny',
    'macro-friendly',
    'low-fat',
    'diet',
    'goal',
    'macro',
    'crush',
    'optimize',
    'cut',
    'bulk',
  ];

  it('emits no banned-vocab string for any curated cuisine template', async () => {
    const { CULTURAL_FLUENCY_TEMPLATES } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../src/services/culturalFluencyInsightService');
    const allCopy = Object.values(
      CULTURAL_FLUENCY_TEMPLATES as Record<string, string>,
    ).join(' ').toLowerCase();
    for (const term of BANNED) {
      expect(allCopy).not.toContain(term.toLowerCase());
    }
  });

  it('emits no banned-vocab string for the generic-fallback insight', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Bhutanese' }, cookedAt: new Date('2026-05-01T12:00:00Z') },
      { recipe: { cuisine: 'Bhutanese' }, cookedAt: new Date('2026-05-02T12:00:00Z') },
      { recipe: { cuisine: 'Bhutanese' }, cookedAt: new Date('2026-05-03T12:00:00Z') },
    ]);
    const result = await generateWeeklyInsight({
      userId: 'u1',
      asOfDate: new Date('2026-05-06T12:00:00Z'),
    });
    const insightLower = (result?.insight ?? '').toLowerCase();
    for (const term of BANNED) {
      expect(insightLower).not.toContain(term.toLowerCase());
    }
  });
});
