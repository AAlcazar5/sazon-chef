// ROADMAP 4.0 TB0 — Embedding store helper.
//
// Encodes/decodes 64-dim Float32 vectors as raw Bytes for the
// Recipe.embedding column (256 B per recipe). Single source of truth
// for the dimension constant.

export const EMBEDDING_DIM = 64;

const BYTES_PER_FLOAT = 4;

export function encodeEmbedding(vec: number[]): Buffer {
  if (vec.length !== EMBEDDING_DIM) {
    throw new Error(
      `encodeEmbedding: expected dim ${EMBEDDING_DIM}, got ${vec.length}`,
    );
  }
  for (const v of vec) {
    if (!Number.isFinite(v)) {
      throw new Error('encodeEmbedding: non-finite value in vector');
    }
  }
  const f32 = new Float32Array(vec);
  return Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
}

export function decodeEmbedding(
  buf: Buffer | Uint8Array | null | undefined,
): number[] | null {
  if (buf === null || buf === undefined) return null;
  const expected = EMBEDDING_DIM * BYTES_PER_FLOAT;
  if (buf.byteLength !== expected) {
    throw new Error(
      `decodeEmbedding: expected ${expected} bytes (dim ${EMBEDDING_DIM}), got ${buf.byteLength}`,
    );
  }
  // Buffer/Uint8Array byteOffset must be respected when slicing into Float32Array.
  const u8 = buf instanceof Buffer ? buf : Buffer.from(buf);
  const f32 = new Float32Array(
    u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength),
  );
  return Array.from(f32);
}

export function isValidEmbedding(vec: unknown): vec is number[] {
  if (!Array.isArray(vec)) return false;
  if (vec.length !== EMBEDDING_DIM) return false;
  for (const v of vec) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return false;
  }
  return true;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `cosineSimilarity: dimension mismatch (${a.length} vs ${b.length})`,
    );
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}
