// ROADMAP 4.0 TB1.1 — User context vector.
//
// Averages the embeddings of the user's last N cooks with exponential
// time decay (half-life 21d), then optionally biases toward recipes
// that use ingredients about to expire from the user's leftover/pantry
// shelf. The output vector is L2-normalized for cosine retrieval.

import { prisma } from '../../lib/prisma';
import {
  EMBEDDING_DIM,
  decodeEmbedding,
  isValidEmbedding,
} from './embeddingStore';

export interface BuildContextVectorOptions {
  userId: string;
  asOf: Date;
  maxCookHistory?: number;
  halfLifeDays?: number;
  pantryBiasWeight?: number;
}

export interface ContextVectorResult {
  vector: number[] | null;
  cookCount: number;
  pantryBoostCount: number;
}

const DEFAULT_MAX_HISTORY = 30;
const DEFAULT_HALF_LIFE_DAYS = 21;
const DEFAULT_PANTRY_BIAS = 0.15;

function dayDiff(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function l2Normalize(vec: number[]): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export async function buildContextVector(
  opts: BuildContextVectorOptions,
): Promise<ContextVectorResult> {
  const maxHistory = opts.maxCookHistory ?? DEFAULT_MAX_HISTORY;
  const halfLife = opts.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS;
  const pantryWeight = opts.pantryBiasWeight ?? DEFAULT_PANTRY_BIAS;

  const cooks = (await (prisma as any).cookingLog.findMany({
    where: { userId: opts.userId },
    orderBy: { cookedAt: 'desc' },
    take: maxHistory,
    select: { recipeId: true, cookedAt: true },
  })) as Array<{ recipeId: string; cookedAt: Date }>;

  let cookEmbeddings: Array<{ vec: number[]; weight: number }> = [];
  if (cooks.length > 0) {
    const recipeIds = Array.from(new Set(cooks.map((c) => c.recipeId)));
    const recipes = (await prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
      select: { id: true, embedding: true } as any,
    } as any)) as unknown as Array<{ id: string; embedding: Buffer | null }>;
    const byId = new Map(recipes.map((r) => [r.id, r.embedding]));
    for (const cook of cooks) {
      const buf = byId.get(cook.recipeId);
      if (!buf) continue;
      let decoded: number[] | null;
      try {
        decoded = decodeEmbedding(buf);
      } catch {
        continue;
      }
      if (!isValidEmbedding(decoded)) continue;
      const ageDays = Math.max(0, dayDiff(opts.asOf, cook.cookedAt));
      const weight = Math.pow(0.5, ageDays / halfLife);
      cookEmbeddings.push({ vec: decoded as number[], weight });
    }
  }

  // Pantry-expiring bias: pull recipes whose ingredients overlap with
  // expiring leftovers; small additive contribution.
  let pantryBoostCount = 0;
  let pantryAccumulator: number[] | null = null;
  if (pantryWeight > 0) {
    const leftovers = (await (prisma as any).leftoverInventory.findMany({
      where: {
        userId: opts.userId,
        expiresAt: { gte: opts.asOf },
      },
      orderBy: { expiresAt: 'asc' },
      take: 5,
      include: { component: { select: { name: true } } },
    })) as Array<{ component: { name: string }; expiresAt: Date }>;

    if (leftovers.length > 0) {
      const ingredientNames = leftovers.map((l) =>
        (l.component?.name ?? '').toLowerCase(),
      );
      const candidates = (await prisma.recipe.findMany({
        where: {
          deletedAt: null,
          ingredients: {
            some: {
              text: { in: ingredientNames },
            },
          },
        } as any,
        take: 20,
        select: { id: true, embedding: true } as any,
      } as any)) as unknown as Array<{
        id: string;
        embedding: Buffer | null;
      }>;

      pantryAccumulator = new Array(EMBEDDING_DIM).fill(0);
      for (const c of candidates) {
        let v: number[] | null;
        try {
          v = decodeEmbedding(c.embedding);
        } catch {
          continue;
        }
        if (!isValidEmbedding(v)) continue;
        for (let i = 0; i < EMBEDDING_DIM; i++) {
          pantryAccumulator[i] += (v as number[])[i];
        }
        pantryBoostCount++;
      }
      if (pantryBoostCount > 0) {
        for (let i = 0; i < EMBEDDING_DIM; i++) {
          pantryAccumulator[i] /= pantryBoostCount;
        }
      } else {
        pantryAccumulator = null;
      }
    }
  }

  if (cookEmbeddings.length === 0 && !pantryAccumulator) {
    return { vector: null, cookCount: 0, pantryBoostCount };
  }

  const acc = new Array(EMBEDDING_DIM).fill(0);
  let totalWeight = 0;
  for (const { vec, weight } of cookEmbeddings) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      acc[i] += vec[i] * weight;
    }
    totalWeight += weight;
  }
  if (totalWeight > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) acc[i] /= totalWeight;
  }
  if (pantryAccumulator) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      acc[i] += pantryWeight * pantryAccumulator[i];
    }
  }

  return {
    vector: l2Normalize(acc),
    cookCount: cookEmbeddings.length,
    pantryBoostCount,
  };
}
