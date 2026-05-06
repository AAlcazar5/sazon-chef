// ROADMAP 4.0 TB2.1 — LLM ranker test.

import {
  rankWithLLM,
  RankInput,
  RankResult,
} from '../../src/services/recommender/recommenderService';

const mockCallLLM = jest.fn();

function input(): RankInput {
  return {
    userContext: {
      tasteSummary: 'loves Italian, comfort food',
      lastCooks: ['Cacio e Pepe', 'Risotto'],
      dietary: [],
      pantrySummary: 'pasta, parmesan, butter',
      timeOfDay: 'evening',
      dayOfWeek: 'Wednesday',
      daysSinceCook: 2,
      expiringItems: [],
    },
    candidates: [
      {
        id: 'r1',
        title: 'Carbonara',
        cuisine: 'italian',
        cookTime: 25,
        retrievalScore: 0.91,
      },
      {
        id: 'r2',
        title: 'Pad Thai',
        cuisine: 'thai',
        cookTime: 30,
        retrievalScore: 0.55,
      },
      {
        id: 'r3',
        title: 'Lasagna',
        cuisine: 'italian',
        cookTime: 60,
        retrievalScore: 0.78,
      },
    ],
    callLLM: mockCallLLM,
  };
}

describe('rankWithLLM (TB2.1)', () => {
  beforeEach(() => mockCallLLM.mockReset());

  it('parses a valid LLM JSON response', async () => {
    mockCallLLM.mockResolvedValue(
      JSON.stringify({
        recipeId: 'r1',
        confidence: 0.85,
        reason: 'You loved Cacio e Pepe — Carbonara is the natural next step',
        runnerUpIds: ['r3', 'r2'],
        selfRating: 5,
      }),
    );
    const out: RankResult | null = await rankWithLLM(input());
    expect(out).not.toBeNull();
    expect(out!.recipeId).toBe('r1');
    expect(out!.confidence).toBeCloseTo(0.85, 2);
    expect(out!.reason).toContain('Carbonara');
    expect(out!.source).toBe('llm');
  });

  it('caps reason length to 120 chars (truncate, not throw)', async () => {
    const long = 'x'.repeat(200);
    mockCallLLM.mockResolvedValue(
      JSON.stringify({
        recipeId: 'r1',
        confidence: 0.7,
        reason: long,
        runnerUpIds: [],
      }),
    );
    const out = await rankWithLLM(input());
    expect(out!.reason.length).toBeLessThanOrEqual(120);
  });

  it('returns retrieval fallback when LLM returns invalid JSON', async () => {
    mockCallLLM.mockResolvedValue('not-json');
    const out = await rankWithLLM(input());
    expect(out).not.toBeNull();
    expect(out!.source).toBe('retrieval_fallback');
    expect(out!.recipeId).toBe('r1');
  });

  it('returns retrieval fallback when LLM throws', async () => {
    mockCallLLM.mockRejectedValue(new Error('rate limited'));
    const out = await rankWithLLM(input());
    expect(out!.source).toBe('retrieval_fallback');
    expect(out!.recipeId).toBe('r1');
  });

  it('returns null when confidence below threshold (e.g., 0.4)', async () => {
    mockCallLLM.mockResolvedValue(
      JSON.stringify({
        recipeId: 'r2',
        confidence: 0.4,
        reason: 'meh',
        runnerUpIds: [],
      }),
    );
    const out = await rankWithLLM({ ...input(), confidenceThreshold: 0.5 });
    expect(out).toBeNull();
  });

  it('rejects when picked recipeId is not in the candidate set', async () => {
    mockCallLLM.mockResolvedValue(
      JSON.stringify({
        recipeId: 'phantom',
        confidence: 0.9,
        reason: 'great',
        runnerUpIds: [],
      }),
    );
    const out = await rankWithLLM(input());
    expect(out!.source).toBe('retrieval_fallback');
  });

  it('returns null when candidate set is empty', async () => {
    const out = await rankWithLLM({ ...input(), candidates: [] });
    expect(out).toBeNull();
    expect(mockCallLLM).not.toHaveBeenCalled();
  });

  it('maps selfRating 1..5 to confidence when confidence missing', async () => {
    mockCallLLM.mockResolvedValue(
      JSON.stringify({
        recipeId: 'r1',
        selfRating: 4,
        reason: 'good',
        runnerUpIds: [],
      }),
    );
    const out = await rankWithLLM(input());
    expect(out!.confidence).toBeCloseTo(0.8, 2);
  });
});
