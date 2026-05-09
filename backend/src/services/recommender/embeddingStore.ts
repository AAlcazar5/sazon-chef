// ROADMAP 4.0 TB0 — Embedding store helper.
//
// Encodes/decodes 64-dim Float32 vectors as raw Bytes for the
// Recipe.embedding column (256 B per recipe). Single source of truth
// for the dimension constant.

import { cosineSimilarity } from '../../utils/vectorMath';

export { cosineSimilarity };

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
