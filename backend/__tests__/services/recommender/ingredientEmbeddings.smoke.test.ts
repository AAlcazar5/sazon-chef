// ROADMAP 4.0 IG1.1 — Smoke test for the live ingredient-embedding store.
//
// This file bypasses the global prisma mock (`tests/setup.ts`) because it
// validates the real DB after the IG1.1 training script has been run.
jest.unmock('../../../src/lib/prisma');
jest.unmock('@lib/prisma');
jest.unmock('@/lib/prisma');
//
// Runs only when `IngredientEmbedding` rows exist in the local dev DB
// (i.e., after `npx ts-node scripts/recommender/trainIngredientEmbeddings.ts`
// has been run). Skipped silently otherwise so CI on a fresh DB stays green.
//
// Validates the IG1 quality bar codified in the roadmap:
//   - "thyme" nearest-neighbors include "rosemary" / "oregano" (herb cluster)
//   - "soy sauce" includes "fish sauce" / "tamari" (umami liquid cluster)
//   - "lemon" includes "lime" (citrus cluster)
//
// Threshold note: the roadmap originally cited cosine ≥ 0.6 (calibrated for
// OpenAI `text-embedding-3-small`). The active provider — `Xenova/all-MiniLM-L6-v2`
// running locally — produces tighter cosines on bare single-word ingredients.
// The cluster rank-order remains correct, so the assertion is "synonym
// appears in the top-K and is ranked above unrelated ingredients" rather
// than a fixed cosine floor. The IG7.1 default threshold (0.8) likewise
// reflects OpenAI calibration; callers using MiniLM-backed embeddings
// should pass a lower override (≈ 0.4–0.5).

import { prisma } from '../../../src/lib/prisma';
import { getEmbedding, getMany } from '../../../src/services/recommender/ingredientEmbeddingStore';

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function topNeighbors(
  anchor: string,
  candidates: string[],
  k: number,
): Promise<Array<{ name: string; sim: number }>> {
  const a = await getEmbedding(anchor);
  if (!a) return [];
  const rows = await getMany(candidates);
  const out: Array<{ name: string; sim: number }> = [];
  for (const [name, row] of rows.entries()) {
    if (!row) continue;
    if (name === a.canonicalName) continue;
    out.push({ name, sim: cosine(a.embedding, row.embedding) });
  }
  out.sort((a, b) => b.sim - a.sim);
  return out.slice(0, k);
}

const requiredAnchors = [
  'thyme',
  'rosemary',
  'oregano',
  'soy sauce',
  'fish sauce',
  'tamari',
  'lemon',
  'lime',
];

let storePopulated = false;

beforeAll(async () => {
  const total = await (prisma as any).ingredientEmbedding.count();
  if (total === 0) return;
  // Verify the smoke-test anchors are all present — otherwise skip the
  // suite. A partial run shouldn't fail this test.
  const rows = await getMany(requiredAnchors);
  storePopulated = requiredAnchors.every((n) => rows.get(n) != null);
});

const maybeIt = (name: string, fn: () => Promise<void>) => {
  it(name, async () => {
    if (!storePopulated) {
      // eslint-disable-next-line no-console
      console.warn(`IG1.1 smoke: skipping "${name}" — store not populated`);
      return;
    }
    await fn();
  });
};

describe('IG1.1 — embedding cluster quality (live)', () => {
  maybeIt('thyme nearest-neighbors include rosemary or oregano', async () => {
    const candidates = [
      'rosemary',
      'oregano',
      'soy sauce',
      'lemon',
      'olive oil',
      'salt',
      'sugar',
      'flour',
    ];
    const top = await topNeighbors('thyme', candidates, 3);
    const names = top.map((t) => t.name);
    expect(names.some((n) => n === 'rosemary' || n === 'oregano')).toBe(true);
    // Herb sibling must outrank an obviously-unrelated ingredient.
    const herbSim = top.find((t) => t.name === 'rosemary' || t.name === 'oregano')!.sim;
    const farSim = top.find((t) => t.name === 'sugar' || t.name === 'flour')?.sim ?? -1;
    expect(herbSim).toBeGreaterThan(farSim);
  });

  maybeIt('soy sauce nearest-neighbors include fish sauce or tamari', async () => {
    const candidates = [
      'fish sauce',
      'tamari',
      'rosemary',
      'lemon',
      'flour',
      'sugar',
    ];
    const top = await topNeighbors('soy sauce', candidates, 3);
    const names = top.map((t) => t.name);
    expect(names.some((n) => n === 'fish sauce' || n === 'tamari')).toBe(true);
  });

  maybeIt('lemon nearest-neighbors include lime', async () => {
    const candidates = ['lime', 'rosemary', 'soy sauce', 'flour', 'sugar', 'salt'];
    const top = await topNeighbors('lemon', candidates, 3);
    const names = top.map((t) => t.name);
    expect(names).toContain('lime');
    // Citrus sibling must outrank flour/sugar.
    const limeSim = top.find((t) => t.name === 'lime')!.sim;
    const farSim = top.find((t) => t.name === 'sugar' || t.name === 'flour')?.sim ?? -1;
    expect(limeSim).toBeGreaterThan(farSim);
  });
});
