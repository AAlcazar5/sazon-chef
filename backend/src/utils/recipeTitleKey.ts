// backend/src/utils/recipeTitleKey.ts
//
// Canonical "is this the same dish?" key for recipe titles. Shared by the
// duplicate-detection script, the post-run prune script, and the dedup-aware
// seed script so all three agree on what counts as a duplicate.
//
// Mirrors the frontend's normalizeTitleKey (frontend/utils/recipeUtils.ts)
// exactly — lowercase, NFKD, strip combining accents, strip punctuation /
// symbols, collapse whitespace. Keep the two in sync: a divergence means the
// client could hide a duplicate the DB still considers distinct (or vice
// versa).

export function normalizeRecipeTitleKey(title: string | null | undefined): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation / symbols
    .replace(/\s+/g, ' ')
    .trim();
}
