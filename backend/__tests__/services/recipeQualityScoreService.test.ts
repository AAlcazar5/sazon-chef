// backend/__tests__/services/recipeQualityScoreService.test.ts
// ROADMAP 4.0 Tier D2 — Quality scorecard infrastructure (TDD).

import {
  computeComposite,
  scoreRecipe,
  AxisScores,
} from '../../src/services/recipeQualityScoreService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.recipeQualityScore) {
    mockPrisma.recipeQualityScore = {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    };
  } else {
    mockPrisma.recipeQualityScore.upsert = jest.fn();
    mockPrisma.recipeQualityScore.findUnique = jest.fn();
  }
});

describe('computeComposite', () => {
  it('returns 100 when every axis is 5/5', () => {
    const axes: AxisScores = {
      image: 5,
      structure: 5,
      nutrition: 5,
      voice: 5,
      dedupe: 5,
      safety: 5,
    };
    const { composite, failureReasons } = computeComposite(axes);
    expect(composite).toBe(100);
    expect(failureReasons).toEqual([]);
  });

  it('returns 0 when every axis is 0/5', () => {
    const axes: AxisScores = {
      image: 0,
      structure: 0,
      nutrition: 0,
      voice: 0,
      dedupe: 0,
      safety: 0,
    };
    const { composite } = computeComposite(axes);
    expect(composite).toBe(0);
  });

  it('renormalizes when only some axes are provided', () => {
    // image=4 (weight 25), structure=5 (weight 25), others null.
    // ((4/5)*25 + (5/5)*25) / (25+25) * 100 = (20 + 25) / 50 * 100 = 90
    const axes: AxisScores = { image: 4, structure: 5 };
    const { composite, failureReasons } = computeComposite(axes);
    expect(composite).toBe(90);
    // 4 axes missing → 4 axis_unavailable reasons
    const unavailable = failureReasons.filter(
      (r) => r.code === 'axis_unavailable',
    );
    expect(unavailable.map((r) => r.axis).sort()).toEqual([
      'dedupe',
      'nutrition',
      'safety',
      'voice',
    ]);
  });

  it('returns 0 + reason for every axis when input is empty', () => {
    const { composite, failureReasons } = computeComposite({});
    expect(composite).toBe(0);
    expect(failureReasons).toHaveLength(6);
    expect(
      failureReasons.every((r) => r.code === 'axis_unavailable'),
    ).toBe(true);
    expect(failureReasons.map((r) => r.axis).sort()).toEqual([
      'dedupe',
      'image',
      'nutrition',
      'safety',
      'structure',
      'voice',
    ]);
  });

  it('rejects axis values outside the 0-5 range', () => {
    expect(() => computeComposite({ image: 6 } as AxisScores)).toThrow();
    expect(() => computeComposite({ image: -1 } as AxisScores)).toThrow();
  });

  it('weights image and structure at 25% each, nutrition+voice at 15%, dedupe+safety at 10%', () => {
    // Only image=5/5 provided. Composite = (5/5)*25 / 25 * 100 = 100
    expect(computeComposite({ image: 5 }).composite).toBe(100);
    // Image=5, dedupe=0. Composite = ((5/5)*25 + (0/5)*10) / (25+10) * 100 = 25/35*100 ≈ 71.43
    const r = computeComposite({ image: 5, dedupe: 0 });
    expect(r.composite).toBeCloseTo(71.43, 1);
  });
});

describe('scoreRecipe', () => {
  it('throws on empty recipeId', async () => {
    await expect(
      scoreRecipe({ recipeId: '', axes: { image: 5 } }),
    ).rejects.toThrow();
  });

  it('upserts a row with the computed composite + axis scores + failureReasons JSON', async () => {
    mockPrisma.recipeQualityScore.upsert.mockResolvedValue({
      id: 'q1',
      recipeId: 'r1',
      composite: 100,
      imageScore: 5,
      structureScore: 5,
      nutritionScore: 5,
      voiceScore: 5,
      dedupeScore: 5,
      safetyScore: 5,
      failureReasons: '[]',
      scoredAt: new Date(),
    });
    const axes: AxisScores = {
      image: 5,
      structure: 5,
      nutrition: 5,
      voice: 5,
      dedupe: 5,
      safety: 5,
    };
    const result = await scoreRecipe({ recipeId: 'r1', axes });
    expect(result.composite).toBe(100);
    expect(mockPrisma.recipeQualityScore.upsert).toHaveBeenCalledTimes(1);
    const upsertCall = mockPrisma.recipeQualityScore.upsert.mock.calls[0][0];
    expect(upsertCall.where).toEqual({ recipeId: 'r1' });
    expect(upsertCall.create.composite).toBe(100);
    expect(upsertCall.create.imageScore).toBe(5);
    // failureReasons stored as JSON string
    expect(typeof upsertCall.create.failureReasons).toBe('string');
    expect(JSON.parse(upsertCall.create.failureReasons)).toEqual([]);
  });

  it('persists nullable axes as null + records failure reasons', async () => {
    mockPrisma.recipeQualityScore.upsert.mockImplementation(({ create }: any) =>
      Promise.resolve({ id: 'q1', recipeId: 'r1', ...create, scoredAt: new Date() }),
    );
    const result = await scoreRecipe({
      recipeId: 'r1',
      axes: { image: 4, structure: 5 },
    });
    const call = mockPrisma.recipeQualityScore.upsert.mock.calls[0][0];
    expect(call.create.imageScore).toBe(4);
    expect(call.create.structureScore).toBe(5);
    expect(call.create.nutritionScore).toBeNull();
    expect(call.create.voiceScore).toBeNull();
    expect(call.create.dedupeScore).toBeNull();
    expect(call.create.safetyScore).toBeNull();
    const reasons = JSON.parse(call.create.failureReasons);
    expect(reasons).toHaveLength(4);
    expect(reasons.every((r: any) => r.code === 'axis_unavailable')).toBe(true);
    expect(result.composite).toBe(90);
  });

  it('is idempotent — re-running with the same input upserts the same composite', async () => {
    mockPrisma.recipeQualityScore.upsert.mockImplementation(({ create, update }: any) =>
      Promise.resolve({
        id: 'q1',
        recipeId: 'r1',
        ...(update ?? create),
        scoredAt: new Date(),
      }),
    );
    const axes: AxisScores = { image: 5, structure: 5 };
    const a = await scoreRecipe({ recipeId: 'r1', axes });
    const b = await scoreRecipe({ recipeId: 'r1', axes });
    expect(a.composite).toBe(b.composite);
    expect(mockPrisma.recipeQualityScore.upsert).toHaveBeenCalledTimes(2);
    // Both calls write the same composite
    const calls = mockPrisma.recipeQualityScore.upsert.mock.calls;
    expect(calls[0][0].update.composite).toBe(calls[1][0].update.composite);
  });

  it('appends caller-supplied custom failure reasons alongside axis_unavailable codes', async () => {
    mockPrisma.recipeQualityScore.upsert.mockImplementation(({ create }: any) =>
      Promise.resolve({ id: 'q1', recipeId: 'r1', ...create, scoredAt: new Date() }),
    );
    await scoreRecipe({
      recipeId: 'r1',
      axes: { image: 1 },
      extraReasons: [
        { axis: 'image', code: 'image_unreachable', detail: 'HEAD 404' },
      ],
    });
    const reasons = JSON.parse(
      mockPrisma.recipeQualityScore.upsert.mock.calls[0][0].create.failureReasons,
    );
    expect(reasons.find((r: any) => r.code === 'image_unreachable')).toEqual({
      axis: 'image',
      code: 'image_unreachable',
      detail: 'HEAD 404',
    });
    // 5 missing axes still recorded
    expect(
      reasons.filter((r: any) => r.code === 'axis_unavailable'),
    ).toHaveLength(5);
  });
});
