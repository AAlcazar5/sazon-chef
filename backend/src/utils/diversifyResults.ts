// backend/src/utils/diversifyResults.ts
//
// Score-preserving diversifier for sorted recipe lists. Used post-sort to
// stop the home feed from emitting 3-4 near-twin recipes back-to-back
// (e.g., four "Soy-Honey Sesame Glazed…" variants surfacing at positions
// 1-4 because all six glazed-bite seeds score within a percentage point
// of each other).
//
// Algorithm: walk the sorted input. For each recipe, if its title
// signature matches anything in the last K outputs, push it into a
// deferred queue. After every successful emission, try to drain the
// deferred queue — releasing items as soon as their conflict window has
// rotated out. Anything still deferred at the end (no diverse slot ever
// opened) is appended in original sort order.
//
// We do NOT drop recipes — every input survives the pass. We only re-
// position near-duplicates to break up clusters. Score order is
// preserved as much as possible: the top-scoring item in any signature
// group always emits before its lower-scoring twins.
//
// Embeddings are the right long-term diversity signal (see dedupeScorer.ts),
// but Recipe.embedding is currently NULL across the catalog. Title-prefix
// signature is a cheap proxy that works today and can be replaced when
// embeddings ship.

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'with', 'and', 'or', '&',
  'in', 'on', 'for', 'to', 'from', 'at', 'by',
]);

/**
 * Compute a stable signature for a recipe title. Two recipes with the
 * same signature are treated as near-duplicates by the diversifier.
 * Default heuristic: first two meaningful words, lowercased, stop-words
 * dropped, separators collapsed.
 *
 * Examples:
 *   "Soy-Honey Sesame Glazed Chicken" → "soy-honey sesame"
 *   "A Pot of Spicy Ramen"            → "pot spicy"
 *   "Tacos"                           → "tacos"
 */
export function titleSignature(title: string | null | undefined): string {
  if (!title) return '';
  const trimmed = title.trim().toLowerCase();
  if (!trimmed) return '';
  // Split on whitespace and ampersand; keep hyphens inside compound tokens
  // (e.g., "soy-honey" stays one token, since the cluster lives in those
  // hyphenated brand-style names).
  const tokens = trimmed.split(/[\s&]+/).filter(Boolean);
  const meaningful = tokens.filter((t) => !STOP_WORDS.has(t));
  return meaningful.slice(0, 2).join(' ');
}

interface Diversifiable {
  id?: string;
  title?: string | null;
}

/**
 * Greedy MMR-lite diversifier. Walks `recipes` in input order (assumed
 * already sorted by relevance/score) and re-positions near-duplicates so
 * no two share a signature within any K-recipe window.
 *
 * @param recipes input list (typically post-sort by matchPercentage)
 * @param k window size — no two same-signature recipes allowed within
 *          any (K+1)-recipe window. Default 2.
 * @returns same recipes, re-ordered for diversity. No recipes added or
 *          dropped.
 */
export function diversifyByTitleSignature<T extends Diversifiable>(
  recipes: T[],
  k = 2,
): T[] {
  if (recipes.length <= 1) return recipes.slice();

  const out: T[] = [];
  const deferred: T[] = [];

  const conflictsWithTail = (candidate: T): boolean => {
    const sig = titleSignature(candidate.title);
    if (!sig) return false; // empty signatures never conflict
    const tail = out.slice(-k);
    return tail.some((emitted) => titleSignature(emitted.title) === sig);
  };

  const tryDrainDeferred = (): void => {
    let i = 0;
    while (i < deferred.length) {
      if (!conflictsWithTail(deferred[i])) {
        out.push(deferred[i]);
        deferred.splice(i, 1);
        // Restart scan — the tail just changed, so earlier-deferred items
        // that previously conflicted may now be releasable.
        i = 0;
      } else {
        i += 1;
      }
    }
  };

  for (const recipe of recipes) {
    if (conflictsWithTail(recipe)) {
      deferred.push(recipe);
    } else {
      out.push(recipe);
      tryDrainDeferred();
    }
  }

  // Anything still deferred had no diverse slot during the pass. Append
  // in original (score) order rather than dropping them. This is rare —
  // it only happens when the catalog is dominated by one signature.
  return [...out, ...deferred];
}
