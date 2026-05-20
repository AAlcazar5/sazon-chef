// frontend/lib/coach/adhocRecipeStash.ts
//
// Tier Y-Live-2 follow-up (founder 2026-05-20): AI-generated recipes
// have no catalog id, so navigating from the launch modal's "Start
// cooking" to /cook-step?recipeId=... can't work — there's no backend
// row to look up. Instead we stash the full payload in this module-
// level map, navigate with `?adhocId=<uuid>`, and /cook-step hydrates
// from here. Same single-process simplicity as a global ref; React-Query
// would also work but pulls in a query-client dependency on a screen
// that otherwise has none.
//
// Lifecycle: writes wipe prior entries (only one in-flight handoff is
// possible — the user can't launch two recipes simultaneously). Reads
// don't delete (so a re-render after navigation still finds it). The
// stash clears on the next navigation.

import type { RecipeCardPayload } from './findOrGenerateRecipe';

const store = new Map<string, RecipeCardPayload>();

export function setAdhocRecipe(id: string, recipe: RecipeCardPayload): void {
  // Single-slot semantics — wipe any prior entry so the map never grows.
  store.clear();
  store.set(id, recipe);
}

export function getAdhocRecipe(id: string): RecipeCardPayload | undefined {
  return store.get(id);
}

/** Test-only / hot-reload escape hatch. Production code never calls this. */
export function clearAdhocRecipes(): void {
  store.clear();
}

/** Cryptographically-unnecessary but URL-safe id generator — the value
 *  only lives long enough for one navigation, no security boundary. */
export function makeAdhocRecipeId(): string {
  return `adhoc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
