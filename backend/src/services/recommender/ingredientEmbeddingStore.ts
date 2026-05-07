// ROADMAP 4.0 IG0.3 — Ingredient embedding store.
//
// Mirrors TB0's RecipeEmbedding shape but for canonical ingredient names.
// One row per canonical name (pre-normalized). Powers IG1 (semantic
// similarity), IG6 (learned swap fallback), IG7 (semantic pantry match).
//
// Vector dimension is configurable per row so we can swap models without
// data migration — each row stores its own `dimensions` for round-trip
// validation.

import { prisma } from '../../lib/prisma';
import { normalizeIngredientName } from '../../utils/ingredientNormalizer';

const BYTES_PER_FLOAT = 4;

export interface IngredientEmbeddingRow {
  canonicalName: string;
  embedding: number[];
  model: string;
  dimensions: number;
}

export function encodeIngredientEmbedding(vec: number[]): Buffer {
  if (vec.length === 0) {
    throw new Error('encodeIngredientEmbedding: empty vector');
  }
  for (const v of vec) {
    if (!Number.isFinite(v)) {
      throw new Error('encodeIngredientEmbedding: non-finite value');
    }
  }
  const f32 = new Float32Array(vec);
  return Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
}

export function decodeIngredientEmbedding(
  buf: Buffer | Uint8Array | null | undefined,
  expectedDim: number,
): number[] | null {
  if (buf === null || buf === undefined) return null;
  const expectedBytes = expectedDim * BYTES_PER_FLOAT;
  if (buf.byteLength !== expectedBytes) {
    throw new Error(
      `decodeIngredientEmbedding: dim mismatch — expected ${expectedDim} (${expectedBytes} bytes), got ${buf.byteLength} bytes`,
    );
  }
  const u8 = buf instanceof Buffer ? buf : Buffer.from(buf);
  const f32 = new Float32Array(
    u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength),
  );
  return Array.from(f32);
}

export interface UpsertEmbeddingInput {
  name: string;
  embedding: number[];
  model: string;
}

/**
 * Upsert a single ingredient embedding row. Name is normalized before persist.
 */
export async function upsertEmbedding(input: UpsertEmbeddingInput): Promise<void> {
  if (!input.name) throw new Error('upsertEmbedding: name required');
  if (!input.model) throw new Error('upsertEmbedding: model required');
  const canonical = normalizeIngredientName(input.name);
  const buf = encodeIngredientEmbedding(input.embedding);
  await (prisma as any).ingredientEmbedding.upsert({
    where: { canonicalName: canonical },
    create: {
      canonicalName: canonical,
      embedding: buf,
      model: input.model,
      dimensions: input.embedding.length,
    },
    update: {
      embedding: buf,
      model: input.model,
      dimensions: input.embedding.length,
    },
  });
}

/** Read a single embedding by name. Returns null when absent. */
export async function getEmbedding(
  name: string,
): Promise<IngredientEmbeddingRow | null> {
  if (!name) return null;
  const canonical = normalizeIngredientName(name);
  const row = (await (prisma as any).ingredientEmbedding.findUnique({
    where: { canonicalName: canonical },
  })) as {
    canonicalName: string;
    embedding: Buffer;
    model: string;
    dimensions: number;
  } | null;
  if (!row) return null;
  const decoded = decodeIngredientEmbedding(row.embedding, row.dimensions);
  if (!decoded) return null;
  return {
    canonicalName: row.canonicalName,
    embedding: decoded,
    model: row.model,
    dimensions: row.dimensions,
  };
}

/**
 * Bulk-read embeddings. Returns a map keyed by *normalized* canonical name;
 * missing entries are present with `null` value so callers can detect absent
 * names without re-running the lookup.
 */
export async function getMany(
  names: string[],
): Promise<Map<string, IngredientEmbeddingRow | null>> {
  const out = new Map<string, IngredientEmbeddingRow | null>();
  if (names.length === 0) return out;
  const canonical = Array.from(new Set(names.map(normalizeIngredientName)));
  // Pre-populate map with nulls so callers can detect missing entries.
  for (const c of canonical) out.set(c, null);
  const rows = (await (prisma as any).ingredientEmbedding.findMany({
    where: { canonicalName: { in: canonical } },
  })) as Array<{
    canonicalName: string;
    embedding: Buffer;
    model: string;
    dimensions: number;
  }>;
  for (const r of rows) {
    const decoded = decodeIngredientEmbedding(r.embedding, r.dimensions);
    if (!decoded) continue;
    out.set(r.canonicalName, {
      canonicalName: r.canonicalName,
      embedding: decoded,
      model: r.model,
      dimensions: r.dimensions,
    });
  }
  return out;
}
