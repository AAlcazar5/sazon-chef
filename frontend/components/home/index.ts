// frontend/components/home/index.ts
// Exports for home screen components

export { default as FilterModal } from './FilterModal';
export { default as RecipeSearchBar } from './RecipeSearchBar';
export { default as HomeHeader } from './HomeHeader';
export { default as QuickFiltersBar } from './QuickFiltersBar';
export { default as MealPrepModeHeader } from './MealPrepModeHeader';
export { default as PaginationControls } from './PaginationControls';
export { default as RecipeSectionsGrid } from './RecipeSectionsGrid';
export { default as SearchScopeSelector } from './SearchScopeSelector';
export type { SearchScope } from './SearchScopeSelector';
export { default as SurpriseMeModal } from './SurpriseMeModal';
export type { SurpriseFilters } from './SurpriseMeModal';
export { default as ParallaxHeroSection } from './ParallaxHeroSection';
export { default as DislikeReasonSheet } from './DislikeReasonSheet';
export type { DislikeReason } from './DislikeReasonSheet';
export { default as NoResultsState } from './NoResultsState';
export { default as IngredientSpotlightCard } from './IngredientSpotlightCard';

// Group 11 Phase 5 — adaptive surfaces
export { NewToYouSection } from './NewToYouSection';
export type { NewToYouRecipe, NewToYouFeed } from './NewToYouSection';
export { BrowseByFamilySection } from './BrowseByFamilySection';
export type { FamilyEntry, BrowseByFamilyResponse } from './BrowseByFamilySection';

// Editorial v2 components
export { EditorialMacroWidgets } from './EditorialMacroWidgets';
export { EditorialHomeLayout } from './EditorialHomeLayout';
export { default as PantryPlateHeroCard } from './PantryPlateHeroCard';
// ROADMAP 4.0 BAP1.1 — Today plate variants. Y-Dead-2a + 2c (2026-05-21)
// dropped the legacy sub-cards (RecipeOfTheDayCard,
// FeaturedRecipeCarousel, SeasonalPicksSection, StretchHomeCard,
// PlateOfWeekCard, EditorialGreeting, EditorialQuickPicks, SurpriseFAB,
// HeroRerollPill, RecipeCarouselSection) AND the BAP0.1-revert orphan
// TodayPlateHero — all had zero consumers.
export { default as TodayPlateCard } from './TodayPlateCard';
export { default as PlateRationaleRibbon } from './PlateRationaleRibbon';
export { default as VoiceComposerModal } from './VoiceComposerModal';
