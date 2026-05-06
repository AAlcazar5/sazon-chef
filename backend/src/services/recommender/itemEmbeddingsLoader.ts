// ROADMAP 4.0 TB0.2 — Item embeddings loader.
//
// Reads the JSON artifact emitted by trainItemEmbeddings.py
//   { "<recipeId>": [64 floats], ... }
// Returns a typed map and a small NN helper for sanity tests.

import * as fs from 'fs';
import { EMBEDDING_DIM, cosineSimilarity } from './embeddingStore';

export type ItemEmbeddingMap = Record<string, number[]>;

export interface LoadOptions {
  expectedDim?: number;
}

export function loadItemEmbeddings(
  filePath: string,
  opts: LoadOptions = {},
): ItemEmbeddingMap {
  const expectedDim = opts.expectedDim ?? EMBEDDING_DIM;
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('loadItemEmbeddings: expected object root');
  }
  const map: ItemEmbeddingMap = {};
  for (const [id, vec] of Object.entries(parsed as Record<string, unknown>)) {
    if (!Array.isArray(vec)) {
      throw new Error(`loadItemEmbeddings: ${id} is not an array`);
    }
    if (vec.length !== expectedDim) {
      throw new Error(
        `loadItemEmbeddings: ${id} has dim ${vec.length}, expected ${expectedDim}`,
      );
    }
    map[id] = vec.map(Number);
  }
  return map;
}

export interface NeighborHit {
  recipeId: string;
  similarity: number;
}

export function topNearestNeighbors(
  map: ItemEmbeddingMap,
  anchorId: string,
  k: number,
): NeighborHit[] {
  const anchor = map[anchorId];
  if (!anchor) {
    throw new Error(`topNearestNeighbors: anchor ${anchorId} not in map`);
  }
  const hits: NeighborHit[] = [];
  for (const [id, vec] of Object.entries(map)) {
    if (id === anchorId) continue;
    hits.push({ recipeId: id, similarity: cosineSimilarity(anchor, vec) });
  }
  hits.sort((a, b) => b.similarity - a.similarity);
  return hits.slice(0, k);
}
