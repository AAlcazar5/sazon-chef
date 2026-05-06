// ROADMAP 4.0 TB0.3 — OpenAI text-embedding fallback.
//
// Wraps `text-embedding-3-small` (configurable) and projects the
// 1536-dim output down to 64-dim via deterministic random projection
// so it lives in the same space as the Food.com two-tower vectors.
// Returns null on missing API key, network error, or invalid response —
// callers treat null as "skip this recipe."

import { EMBEDDING_DIM } from './embeddingStore';

const OPENAI_DIM = 1536;
const OPENAI_URL = 'https://api.openai.com/v1/embeddings';
const PROJECTION_SEED = 0x9e3779b9;

let cachedProjection: number[][] | null = null;

// Mulberry32 — deterministic 32-bit RNG.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getProjection(
  inDim = OPENAI_DIM,
  outDim = EMBEDDING_DIM,
): number[][] {
  if (cachedProjection && cachedProjection.length === outDim) {
    return cachedProjection;
  }
  const rng = mulberry32(PROJECTION_SEED);
  const matrix: number[][] = [];
  for (let r = 0; r < outDim; r++) {
    const row: number[] = [];
    for (let c = 0; c < inDim; c++) {
      // Box-Muller for ~N(0, 1/sqrt(outDim)) — Johnson-Lindenstrauss.
      const u1 = Math.max(rng(), 1e-12);
      const u2 = rng();
      const n = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      row.push(n / Math.sqrt(outDim));
    }
    matrix.push(row);
  }
  cachedProjection = matrix;
  return matrix;
}

export function projectDown(vec: number[], outDim = EMBEDDING_DIM): number[] {
  const proj = getProjection(vec.length, outDim);
  const out: number[] = new Array(outDim).fill(0);
  for (let r = 0; r < outDim; r++) {
    let s = 0;
    const row = proj[r];
    for (let c = 0; c < vec.length; c++) {
      s += row[c] * vec[c];
    }
    out[r] = s;
  }
  // L2 normalize so cosine sim is comparable to Food.com vectors.
  let norm = 0;
  for (const v of out) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return out;
  return out.map((v) => v / norm);
}

export interface OpenAIEmbedOptions {
  apiKey?: string | null;
  model?: string;
  fetchFn?: typeof fetch;
}

export function makeOpenAIEmbed(opts: OpenAIEmbedOptions = {}) {
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY ?? null;
  const model = opts.model ?? 'text-embedding-3-small';
  const fetchFn = opts.fetchFn ?? fetch;

  if (!apiKey) {
    return null;
  }

  return async function openaiEmbed(text: string): Promise<number[] | null> {
    try {
      const res = await fetchFn(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ input: text, model }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as any;
      const vec = json?.data?.[0]?.embedding;
      if (!Array.isArray(vec) || vec.length === 0) return null;
      return projectDown(vec.map(Number), EMBEDDING_DIM);
    } catch {
      return null;
    }
  };
}
