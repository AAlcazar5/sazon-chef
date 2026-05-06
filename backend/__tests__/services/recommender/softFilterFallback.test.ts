// ROADMAP 4.0 FX3.1 — soft-filter fallback when post-filter candidates < threshold.
// FX3.3 — empty post-filter result is logged via recordZeroResultFilter.

jest.mock('../../../src/services/recommender/contextVector', () => ({
  buildContextVector: jest.fn(),
}));
jest.mock('../../../src/services/recommender/retrieveCandidates', () => ({
  retrieveCandidates: jest.fn(),
}));
jest.mock('../../../src/services/recommender/recommenderEventService', () => ({
  recordZeroResultFilter: jest.fn(),
}));

import {
  resolveRetrievalCandidates,
  SOFT_FILTER_THRESHOLD,
} from '../../../src/services/recommender/homeFeedRetrievalAdapter';
import { buildContextVector } from '../../../src/services/recommender/contextVector';
import { retrieveCandidates } from '../../../src/services/recommender/retrieveCandidates';
import { recordZeroResultFilter } from '../../../src/services/recommender/recommenderEventService';

const buildContextVectorMock = buildContextVector as jest.Mock;
const retrieveCandidatesMock = retrieveCandidates as jest.Mock;
const recordZeroResultFilterMock = recordZeroResultFilter as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  buildContextVectorMock.mockResolvedValue({ vector: [0.1, 0.2, 0.3] });
});

const filtersThatNarrow = {
  allergens: [],
  dietaryTags: ['vegan'],
  maxCookTime: 30,
  pantryItems: [],
  minPantryCoverage: 0,
};

describe('resolveRetrievalCandidates soft-filter fallback (FX3.1)', () => {
  it('returns the filtered set unchanged when candidates >= threshold', async () => {
    const ids = Array.from({ length: SOFT_FILTER_THRESHOLD }, (_, i) => `r${i}`);
    const scores = ids.map((_, i) => 1 - i * 0.01);
    retrieveCandidatesMock.mockResolvedValueOnce({
      recipeIds: ids, scores, scanned: 100, survivors: ids.length,
    });

    const result = await resolveRetrievalCandidates({
      userId: 'u1', enabled: true, hardFilters: filtersThatNarrow,
    });

    expect(result?.recipeIds).toEqual(ids);
    expect(result?.softFilterMode).toBe(false);
    expect(retrieveCandidatesMock).toHaveBeenCalledTimes(1);
    expect(recordZeroResultFilterMock).not.toHaveBeenCalled();
  });

  it('falls back to unfiltered top-K when filtered set is below threshold', async () => {
    const sparse = ['r1', 'r2', 'r3'];
    const fullTopK = Array.from({ length: 50 }, (_, i) => `f${i}`);

    retrieveCandidatesMock
      .mockResolvedValueOnce({ recipeIds: sparse, scores: [0.9, 0.8, 0.7], scanned: 100, survivors: 3 })
      .mockResolvedValueOnce({ recipeIds: fullTopK, scores: fullTopK.map((_, i) => 1 - i * 0.01), scanned: 100, survivors: 50 });

    const result = await resolveRetrievalCandidates({
      userId: 'u1', enabled: true, hardFilters: filtersThatNarrow,
      appliedFilters: { quick: true, vegan: true },
    });

    expect(result?.softFilterMode).toBe(true);
    expect(result?.recipeIds).toEqual(fullTopK);
    expect(result?.narrowedBy).toEqual(expect.arrayContaining(['dietary', 'cookTime']));
    expect(retrieveCandidatesMock).toHaveBeenCalledTimes(2);
  });

  it('logs zero-result filter combo when post-filter set is empty AND filters were active (FX3.3)', async () => {
    const fullTopK = Array.from({ length: 50 }, (_, i) => `f${i}`);
    retrieveCandidatesMock
      .mockResolvedValueOnce({ recipeIds: [], scores: [], scanned: 100, survivors: 0 })
      .mockResolvedValueOnce({ recipeIds: fullTopK, scores: fullTopK.map(() => 0.5), scanned: 100, survivors: 50 });

    await resolveRetrievalCandidates({
      userId: 'u1', enabled: true, hardFilters: filtersThatNarrow,
      appliedFilters: { quick: true, vegan: true, glutenFree: true },
    });

    expect(recordZeroResultFilterMock).toHaveBeenCalledTimes(1);
    expect(recordZeroResultFilterMock.mock.calls[0][0]).toMatchObject({
      userId: 'u1',
      filters: { quick: true, vegan: true, glutenFree: true },
    });
  });

  it('does not log zero-result when no filters were active', async () => {
    retrieveCandidatesMock
      .mockResolvedValueOnce({ recipeIds: [], scores: [], scanned: 100, survivors: 0 });

    const result = await resolveRetrievalCandidates({
      userId: 'u1', enabled: true,
      // no hardFilters
    });

    expect(recordZeroResultFilterMock).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns null if unfiltered fallback is also empty', async () => {
    retrieveCandidatesMock
      .mockResolvedValueOnce({ recipeIds: [], scores: [], scanned: 100, survivors: 0 })
      .mockResolvedValueOnce({ recipeIds: [], scores: [], scanned: 100, survivors: 0 });

    const result = await resolveRetrievalCandidates({
      userId: 'u1', enabled: true, hardFilters: filtersThatNarrow,
    });
    expect(result).toBeNull();
  });

  it('returns null when retrieval is disabled', async () => {
    const result = await resolveRetrievalCandidates({ userId: 'u1', enabled: false });
    expect(result).toBeNull();
    expect(retrieveCandidatesMock).not.toHaveBeenCalled();
  });
});
