// backend/src/services/almostMadeItService.ts
// ROADMAP 4.0 HX5.1 — "23 made the cut today — see what almost did?"
//
// Returns the next-N candidates from the same retrieval call that ranked
// just below the visible cut. Each row carries a `marginVsCut` (smaller =
// closer to the cut) so the UI can frame proximity in lifestyle voice
// (no "score" / "ranking" jargon). N0.3's `retrievalSession.getNearMisses`
// cursor lands later — until then, the service runs a single retrieval
// with k = cutoff + tail and slices.

import { resolveRetrievalCandidates } from './recommender/homeFeedRetrievalAdapter';
import { prisma } from '../lib/prisma';

export interface AlmostMadeItArgs {
  userId: string;
  /** Position of the cut — usually the size of the visible page (e.g. 10). */
  cutoff: number;
  /** How many tail recipes to return. Defaults to 5. */
  tail?: number;
}

export interface AlmostMadeItRow {
  id: string;
  title: string;
  imageUrl: string | null;
  cuisine: string | null;
  cookTime: number | null;
  /** Smaller = closer to the cut (rank position - cutoff, 1-indexed). */
  marginVsCut: number;
}

export interface AlmostMadeItResult {
  rows: AlmostMadeItRow[];
  /** Total number of recipes that did make the cut today (for the
   *  "23 made the cut today" copy). */
  cutCount: number;
}

const DEFAULT_TAIL = 5;
const MAX_TAIL = 10;

export async function getAlmostMadeItRows(
  args: AlmostMadeItArgs,
): Promise<AlmostMadeItResult> {
  const tail = Math.min(args.tail ?? DEFAULT_TAIL, MAX_TAIL);
  const cutoff = Math.max(1, args.cutoff);
  const k = cutoff + tail;

  const retrieval = await resolveRetrievalCandidates({
    userId: args.userId,
    k,
  });
  if (!retrieval || retrieval.recipeIds.length === 0) {
    return { rows: [], cutCount: 0 };
  }

  // Slice the rank-ordered ids: [cutoff, cutoff + tail).
  const tailIds = retrieval.recipeIds.slice(cutoff, cutoff + tail);
  if (tailIds.length === 0) {
    return { rows: [], cutCount: retrieval.recipeIds.length };
  }

  const recipes = (await prisma.recipe.findMany({
    where: { id: { in: tailIds } },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      cuisine: true,
      cookTime: true,
    } as any,
  } as any)) as Array<Pick<AlmostMadeItRow, 'id' | 'title' | 'imageUrl' | 'cuisine' | 'cookTime'>>;

  // Preserve the rank-order from `tailIds` and attach margin = (rank+1) - cutoff.
  const rowsById = new Map(recipes.map((r) => [r.id, r]));
  const rows: AlmostMadeItRow[] = [];
  tailIds.forEach((id, i) => {
    const recipe = rowsById.get(id);
    if (!recipe) return;
    rows.push({
      ...recipe,
      marginVsCut: i + 1, // 1 = first one past the cut
    });
  });

  return { rows, cutCount: cutoff };
}
