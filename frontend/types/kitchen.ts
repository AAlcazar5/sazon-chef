// frontend/types/kitchen.ts
// Canonical Kitchen view-mode union. Single source of truth — every consumer
// (cookbook screen, cache, picker modals, similar-recipes carousel, useCookbookCache
// hook) imports from here so the literal stays in one place.

export type CookbookViewMode =
  | 'saved'
  | 'liked'
  | 'disliked'
  | 'collections'
  | 'discover'
  | 'journey'
  | 'stories';

// Aliased name kept for backwards compatibility with existing imports of
// `ViewMode` from `components/cookbook/CookbookFilterModal`.
export type ViewMode = CookbookViewMode;
