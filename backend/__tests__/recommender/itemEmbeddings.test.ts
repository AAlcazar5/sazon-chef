// ROADMAP 4.0 TB0.2 — Item embedding loader test.

import * as path from 'path';
import {
  loadItemEmbeddings,
  topNearestNeighbors,
} from '../../src/services/recommender/itemEmbeddingsLoader';
import { EMBEDDING_DIM } from '../../src/services/recommender/embeddingStore';

const FIXTURE = path.join(
  __dirname,
  '../__fixtures__/recommender/recipeEmbeddings.json',
);

describe('itemEmbeddings (TB0.2)', () => {
  it('loads a fixture file and exposes 64-dim vectors', () => {
    const map = loadItemEmbeddings(FIXTURE);
    const ids = Object.keys(map);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    for (const id of ids) {
      expect(map[id]).toHaveLength(EMBEDDING_DIM);
    }
  });

  it("nearest neighbors of an Italian recipe are also Italian", () => {
    const map = loadItemEmbeddings(FIXTURE);
    const nn = topNearestNeighbors(map, 'italian-1', 2);
    expect(nn).toHaveLength(2);
    for (const hit of nn) {
      expect(hit.recipeId.startsWith('italian-')).toBe(true);
    }
    // Self is excluded.
    expect(nn.find((h) => h.recipeId === 'italian-1')).toBeUndefined();
  });

  it('throws on missing file', () => {
    expect(() => loadItemEmbeddings('/tmp/does-not-exist.json')).toThrow();
  });

  it('throws on dimension mismatch', () => {
    expect(() =>
      loadItemEmbeddings(FIXTURE, { expectedDim: 128 }),
    ).toThrow(/dim/i);
  });
});
