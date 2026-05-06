// ROADMAP 4.0 TB4.2 — End-to-end pipeline regression test.
//
// For each of N synthetic personas, run the full pipeline:
//   personaTasteVector → retrieveCandidates(catalog) → rankWithLLM(canned)
// and snapshot the resulting picks. Any future change to retrieval or
// ranking that shifts >5 personas' picks fails CI until investigated.

import { prisma } from '../../src/lib/prisma';
import { generateSyntheticPersonas } from '../../scripts/recommender/generateSyntheticPersonas';
import { retrieveCandidates } from '../../src/services/recommender/retrieveCandidates';
import { rankWithLLM } from '../../src/services/recommender/recommenderService';
import {
  EMBEDDING_DIM,
  encodeEmbedding,
} from '../../src/services/recommender/embeddingStore';

const findMany = prisma.recipe.findMany as jest.Mock;

function makeFixedCatalog() {
  // 24-recipe synthetic catalog — clusters along axis 0..2.
  const out: any[] = [];
  for (let i = 0; i < 24; i++) {
    const v = Array.from({ length: EMBEDDING_DIM }, (_, j) =>
      Math.cos((i * 0.31 + j * 0.07) % (Math.PI * 2)),
    );
    out.push({
      id: `r${i.toString().padStart(2, '0')}`,
      cuisine: ['italian', 'thai', 'mexican', 'japanese'][i % 4],
      canonicalCuisine: ['italian', 'thai', 'mexican', 'japanese'][i % 4],
      cookTime: 20 + (i % 5) * 10,
      embedding: encodeEmbedding(v),
      ingredients: [{ text: 'tomato' }],
    });
  }
  return out;
}

describe('synthetic pipeline regression (TB4.2)', () => {
  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue(makeFixedCatalog());
  });

  it('runs end-to-end on 100 personas in <30s and snapshots picks', async () => {
    const personas = generateSyntheticPersonas({ seed: 1 });
    const start = Date.now();

    const picks: Array<{ persona: string; recipe: string }> = [];
    for (const persona of personas) {
      const retrieval = await retrieveCandidates({
        userId: persona.id,
        contextVector: persona.tasteSeed,
        hardFilters: {
          allergens: [],
          dietaryTags: [],
          maxCookTime: null,
          pantryItems: [],
          minPantryCoverage: 0,
        },
        k: 10,
      });
      // Canned LLM: always picks the highest retrieval score.
      const cannedLLM = async () =>
        JSON.stringify({
          recipeId: retrieval.recipeIds[0] ?? null,
          confidence: 0.85,
          reason: 'pick',
          runnerUpIds: retrieval.recipeIds.slice(1, 4),
        });
      const ranked = await rankWithLLM({
        userContext: {
          tasteSummary: persona.cuisinePreferences.join(', '),
          lastCooks: [],
          dietary: persona.dietary,
          pantrySummary: '',
          timeOfDay: 'evening',
          dayOfWeek: 'Wednesday',
          daysSinceCook: 1,
          expiringItems: [],
        },
        candidates: retrieval.recipeIds.map((id, i) => ({
          id,
          title: id,
          cuisine: 'italian',
          cookTime: 30,
          retrievalScore: retrieval.scores[i] ?? 0,
        })),
        callLLM: cannedLLM,
        confidenceThreshold: 0.6,
      });
      picks.push({
        persona: persona.id,
        recipe: ranked?.recipeId ?? 'NONE',
      });
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(30_000);
    expect(picks).toHaveLength(100);
    // Snapshot — checked into the repo. A pipeline change that shifts
    // >5 personas' picks surfaces as a diff in PR review.
    expect(picks).toMatchSnapshot('synthetic-100-picks');
  });
});
