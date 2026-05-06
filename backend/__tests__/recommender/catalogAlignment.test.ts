// ROADMAP 4.0 TB0.3 — Catalog alignment test.
//
// Joins Sazon's Recipe rows to Food.com embeddings via TF-IDF
// fingerprint matching, falling back to a content-only OpenAI embedding
// when no Food.com analog exists.

import { prisma } from '../../src/lib/prisma';
import { alignCatalog } from '../../src/services/recommender/catalogAlignment';
import {
  EMBEDDING_DIM,
  decodeEmbedding,
} from '../../src/services/recommender/embeddingStore';

type Mock = jest.Mock;
const findMany = prisma.recipe.findMany as Mock;
const update = prisma.recipe.update as Mock;

function vec(seed: number): number[] {
  return Array.from({ length: EMBEDDING_DIM }, (_, i) =>
    Math.sin(seed * 0.13 + i * 0.07),
  );
}

function makeRecipe(
  id: string,
  ingredients: string[],
  cuisine = 'italian',
): any {
  return {
    id,
    title: `Recipe ${id}`,
    cuisine,
    canonicalCuisine: cuisine,
    ingredients: ingredients.map((name) => ({ name })),
  };
}

describe('alignCatalog (TB0.3)', () => {
  beforeEach(() => {
    findMany.mockReset();
    update.mockReset();
    update.mockResolvedValue({});
  });

  it('matched recipes use Food.com vector; unmatched use OpenAI fallback', async () => {
    findMany.mockResolvedValue([
      // Matches Food.com row 1 (shares pasta + tomato)
      makeRecipe('r1', ['pasta', 'tomato', 'basil']),
      // Should fall through to OpenAI
      makeRecipe('r2', ['kimchi', 'gochujang', 'rice'], 'korean'),
    ]);

    const foodComEmbeddings = {
      '1': vec(1), // pasta-tomato fingerprint
    };
    const foodComRecipes = [
      { id: 1, name: 'Pasta', ingredients: ['pasta', 'tomato', 'garlic'] },
    ];
    const openaiCalls: string[] = [];
    const openaiEmbed = jest.fn(async (text: string) => {
      openaiCalls.push(text);
      return vec(99);
    });

    const result = await alignCatalog({
      foodComEmbeddings,
      foodComRecipes,
      openaiEmbed,
    });

    expect(result.matched).toBe(1);
    expect(result.fallback).toBe(1);
    expect(update).toHaveBeenCalledTimes(2);

    const r1Update = update.mock.calls.find(
      (c: any[]) => c[0].where.id === 'r1',
    );
    expect(r1Update[0].data.embeddingSource).toBe('foodcom');
    const r1Vec = decodeEmbedding(r1Update[0].data.embedding);
    expect(r1Vec).toHaveLength(EMBEDDING_DIM);

    const r2Update = update.mock.calls.find(
      (c: any[]) => c[0].where.id === 'r2',
    );
    expect(r2Update[0].data.embeddingSource).toBe('openai');
    expect(openaiCalls).toHaveLength(1);
  });

  it('is idempotent — second run with no recipe changes makes zero updates', async () => {
    const r1 = makeRecipe('r1', ['pasta', 'tomato']);
    findMany.mockResolvedValue([
      {
        ...r1,
        embedding: Buffer.alloc(EMBEDDING_DIM * 4),
        embeddingSource: 'foodcom',
        embeddingUpdatedAt: new Date(),
      },
    ]);

    const result = await alignCatalog({
      foodComEmbeddings: { '1': vec(1) },
      foodComRecipes: [
        { id: 1, name: 'Pasta', ingredients: ['pasta', 'tomato'] },
      ],
      openaiEmbed: jest.fn(),
      skipExisting: true,
    });

    expect(result.skipped).toBe(1);
    expect(update).not.toHaveBeenCalled();
  });

  it('writes a 64-dim Float32 buffer to Recipe.embedding', async () => {
    findMany.mockResolvedValue([makeRecipe('r1', ['pasta', 'tomato'])]);
    await alignCatalog({
      foodComEmbeddings: { '1': vec(1) },
      foodComRecipes: [
        { id: 1, name: 'Pasta', ingredients: ['pasta', 'tomato'] },
      ],
      openaiEmbed: jest.fn(async () => vec(99)),
    });
    const buf = update.mock.calls[0][0].data.embedding;
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBe(EMBEDDING_DIM * 4);
  });

  it('handles empty catalog gracefully', async () => {
    findMany.mockResolvedValue([]);
    const result = await alignCatalog({
      foodComEmbeddings: {},
      foodComRecipes: [],
      openaiEmbed: jest.fn(),
    });
    expect(result.matched).toBe(0);
    expect(result.fallback).toBe(0);
  });

  it('falls back when openaiEmbed is null and logs unmatched count', async () => {
    findMany.mockResolvedValue([
      makeRecipe('r1', ['kimchi', 'gochujang'], 'korean'),
    ]);
    const result = await alignCatalog({
      foodComEmbeddings: {},
      foodComRecipes: [],
      openaiEmbed: null,
    });
    expect(result.fallback).toBe(0);
    expect(result.unmatched).toBe(1);
    expect(update).not.toHaveBeenCalled();
  });
});
