// P3 retention — engagement gate.

const prismaMock = {
  recipeView: { count: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import {
  isHeavyEngagement,
  shouldSendNonCriticalPush,
  ENGAGEMENT_GATE_HEAVY_THRESHOLD,
} from '../../src/services/engagementGateService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('isHeavyEngagement', () => {
  it('returns true when view count meets the heavy threshold', async () => {
    prismaMock.recipeView.count.mockResolvedValue(
      ENGAGEMENT_GATE_HEAVY_THRESHOLD,
    );
    expect(await isHeavyEngagement('u1')).toBe(true);
  });

  it('returns true when view count exceeds the heavy threshold', async () => {
    prismaMock.recipeView.count.mockResolvedValue(
      ENGAGEMENT_GATE_HEAVY_THRESHOLD + 5,
    );
    expect(await isHeavyEngagement('u1')).toBe(true);
  });

  it('returns false when view count is below the heavy threshold', async () => {
    prismaMock.recipeView.count.mockResolvedValue(
      ENGAGEMENT_GATE_HEAVY_THRESHOLD - 1,
    );
    expect(await isHeavyEngagement('u1')).toBe(false);
  });

  it('fails open when the DB read errors', async () => {
    prismaMock.recipeView.count.mockRejectedValue(new Error('db down'));
    expect(await isHeavyEngagement('u1')).toBe(false);
  });
});

describe('shouldSendNonCriticalPush', () => {
  it('is the inverse of isHeavyEngagement', async () => {
    prismaMock.recipeView.count.mockResolvedValue(
      ENGAGEMENT_GATE_HEAVY_THRESHOLD,
    );
    expect(await shouldSendNonCriticalPush('u1')).toBe(false);

    prismaMock.recipeView.count.mockResolvedValue(
      ENGAGEMENT_GATE_HEAVY_THRESHOLD - 5,
    );
    expect(await shouldSendNonCriticalPush('u1')).toBe(true);
  });
});
