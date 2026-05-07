// ROADMAP 4.0 IG0.3 — IngredientEmbedding store test.

import { prisma } from '../../../src/lib/prisma';
import {
  encodeIngredientEmbedding,
  decodeIngredientEmbedding,
  upsertEmbedding,
  getEmbedding,
  getMany,
} from '../../../src/services/recommender/ingredientEmbeddingStore';

const upsert = jest.fn();
const findUnique = jest.fn();
const findMany = jest.fn();

(prisma as any).ingredientEmbedding = {
  ...((prisma as any).ingredientEmbedding ?? {}),
  upsert,
  findUnique,
  findMany,
};

beforeEach(() => {
  upsert.mockReset();
  findUnique.mockReset();
  findMany.mockReset();
  upsert.mockResolvedValue({});
  findUnique.mockResolvedValue(null);
  findMany.mockResolvedValue([]);
});

describe('IG0.3 — encode/decode round-trip', () => {
  it('preserves Float32 vector bytes', () => {
    const vec = [0.1, -0.5, 1.0, 0.25, -0.75];
    const buf = encodeIngredientEmbedding(vec);
    expect(buf.byteLength).toBe(20); // 5 floats × 4 bytes
    const decoded = decodeIngredientEmbedding(buf, 5);
    expect(decoded).not.toBeNull();
    decoded!.forEach((v, i) => expect(v).toBeCloseTo(vec[i], 5));
  });

  it('encode rejects empty vectors', () => {
    expect(() => encodeIngredientEmbedding([])).toThrow(/empty/i);
  });

  it('encode rejects non-finite values', () => {
    expect(() => encodeIngredientEmbedding([1, NaN, 2])).toThrow(/non-finite/);
    expect(() => encodeIngredientEmbedding([1, Infinity, 2])).toThrow(
      /non-finite/,
    );
  });

  it('decode throws on dimension mismatch', () => {
    const buf = encodeIngredientEmbedding([1, 2, 3]);
    expect(() => decodeIngredientEmbedding(buf, 5)).toThrow(/dim mismatch/);
  });

  it('decode returns null for null/undefined input', () => {
    expect(decodeIngredientEmbedding(null, 3)).toBeNull();
    expect(decodeIngredientEmbedding(undefined, 3)).toBeNull();
  });
});

describe('IG0.3 — upsertEmbedding', () => {
  it('rejects empty name or model', async () => {
    await expect(
      upsertEmbedding({ name: '', embedding: [1, 2], model: 'm1' }),
    ).rejects.toThrow(/name/);
    await expect(
      upsertEmbedding({ name: 'rice', embedding: [1, 2], model: '' }),
    ).rejects.toThrow(/model/);
  });

  it('persists with normalized canonical name + correct dimensions', async () => {
    await upsertEmbedding({
      name: '  Cilantro  ',
      embedding: [0.1, 0.2, 0.3, 0.4],
      model: 'text-embedding-3-small',
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    const args = upsert.mock.calls[0][0];
    expect(args.where.canonicalName).toBe('cilantro');
    expect(args.create.canonicalName).toBe('cilantro');
    expect(args.create.dimensions).toBe(4);
    expect(args.create.model).toBe('text-embedding-3-small');
    expect(Buffer.isBuffer(args.create.embedding)).toBe(true);
    expect(args.create.embedding.byteLength).toBe(16);
  });

  it('update path mirrors create payload', async () => {
    await upsertEmbedding({
      name: 'rice',
      embedding: [0.5, 0.5, 0.5],
      model: 'm1',
    });
    const args = upsert.mock.calls[0][0];
    expect(args.update.dimensions).toBe(3);
    expect(args.update.model).toBe('m1');
  });
});

describe('IG0.3 — getEmbedding', () => {
  it('returns null for empty name', async () => {
    expect(await getEmbedding('')).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns null when row is missing', async () => {
    findUnique.mockResolvedValue(null);
    expect(await getEmbedding('cilantro')).toBeNull();
  });

  it('decodes the stored vector and returns the row', async () => {
    const vec = [0.1, 0.2, 0.3];
    const buf = encodeIngredientEmbedding(vec);
    findUnique.mockResolvedValue({
      canonicalName: 'cilantro',
      embedding: buf,
      model: 'm1',
      dimensions: 3,
    });
    const row = await getEmbedding('cilantro');
    expect(row).not.toBeNull();
    expect(row!.canonicalName).toBe('cilantro');
    expect(row!.dimensions).toBe(3);
    expect(row!.embedding).toHaveLength(3);
    row!.embedding.forEach((v, i) => expect(v).toBeCloseTo(vec[i], 5));
  });

  it('normalizes the lookup name', async () => {
    findUnique.mockResolvedValue(null);
    await getEmbedding('  Cilantro  ');
    expect(findUnique.mock.calls[0][0].where.canonicalName).toBe('cilantro');
  });
});

describe('IG0.3 — getMany', () => {
  it('returns empty map for empty input', async () => {
    const out = await getMany([]);
    expect(out.size).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns a map with null entries for absent names + decoded entries for present', async () => {
    const vec = [1, 0, 0];
    findMany.mockResolvedValue([
      {
        canonicalName: 'cilantro',
        embedding: encodeIngredientEmbedding(vec),
        model: 'm1',
        dimensions: 3,
      },
    ]);
    const out = await getMany(['cilantro', 'rice', 'thyme']);
    expect(out.get('cilantro')!.embedding).toHaveLength(3);
    expect(out.get('rice')).toBeNull();
    expect(out.get('thyme')).toBeNull();
  });

  it('deduplicates input names before querying', async () => {
    findMany.mockResolvedValue([]);
    await getMany(['cilantro', 'CILANTRO', '  cilantro  ']);
    const where = findMany.mock.calls[0][0].where;
    expect(where.canonicalName.in.length).toBe(1);
    expect(where.canonicalName.in[0]).toBe('cilantro');
  });
});
