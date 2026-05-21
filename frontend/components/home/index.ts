// frontend/components/home/index.ts
// Exports for home screen components

export { default as FilterModal } from './FilterModal';
export { default as RecipeSearchBar } from './RecipeSearchBar';
export { default as HomeHeader } from './HomeHeader';
export { default as RecipeOfTheDayCard } from './RecipeOfTheDayCard';
export { default as QuickFiltersBar } from './QuickFiltersBar';
export { default as FeaturedRecipeCarousel } from './FeaturedRecipeCarousel';
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
export { default as SeasonalPicksSection } from './SeasonalPicksSection';
export { default as IngredientSpotlightCard } from './IngredientSpotlightCard';

// Group 11 Phase 5 — adaptive surfaces
export { NewToYouSection } from './NewToYouSection';
export type { NewToYouRecipe, NewToYouFeed } from './NewToYouSection';
export { BrowseByFamilySection } from './BrowseByFamilySection';
export type { FamilyEntry, BrowseByFamilyResponse } from './BrowseByFamilySection';

// Editorial v2 components
export { EditorialGreeting } from './EditorialGreeting';
export { EditorialMacroWidgets } from './EditorialMacroWidgets';
export { EditorialQuickPicks } from './EditorialQuickPicks';
export { SurpriseFAB } from './SurpriseFAB';
export { EditorialHomeLayout } from './EditorialHomeLayout';
export { default as PantryPlateHeroCard } from './PantryPlateHeroCard';
export { default as StretchHomeCard } from './StretchHomeCard';
export { default as PlateOfWeekCard } from './PlateOfWeekCard';
// ROADMAP 4.0 BAP0.1 + BAP1.1 — Today plate hero (replaces the recipe
// hero + the 3 legacy sub-cards). Old exports above are kept temporarily
// until any downstream consumer has migrated to TodayPlateHero.
export { default as TodayPlateHero } from './TodayPlateHero';
export { default as TodayPlateCard } from './TodayPlateCard';
export { default as PlateRationaleRibbon } from './PlateRationaleRibbon';
export { default as VoiceComposerModal } from './VoiceComposerModal';
