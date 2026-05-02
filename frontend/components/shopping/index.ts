// frontend/components/shopping/index.ts
// Barrel export for shopping list components

export { default as ShoppingListHeader } from './ShoppingListHeader';
export { default as ShoppingListItem } from './ShoppingListItem';
export { default as ShoppingListCategory } from './ShoppingListCategory';
export { default as AddItemModal } from './AddItemModal';
export { default as MergeListsModal } from './MergeListsModal';
export { default as ShoppingListProgress } from './ShoppingListProgress';
export { default as BuyAgainSection } from './BuyAgainSection';
export { default as PantrySection } from './PantrySection';
export { default as OfflineBanner } from './OfflineBanner';

// Editorial v2 components
export { ShoppingHeader } from './ShoppingHeader';
export { ProgressStrip } from './ProgressStrip';
export { CategorySection } from './CategorySection';
export { ShoppingItemRow } from './ShoppingItemRow';
export { EditorialShoppingIntro } from './EditorialShoppingIntro';
export { EditorialShoppingProgress } from './EditorialShoppingProgress';
export { EditorialAisleHeader } from './EditorialAisleHeader';

// Group 10Q — Shopping List Intelligence
export { default as BuildFromRecipesSheet } from './BuildFromRecipesSheet';

// Group 10Q-ListMgmt — Archive View
export { default as ArchiveView } from './ArchiveView';
export type { ArchivedList } from './ArchiveView';

// Group 10Q-ListMgmt — Terminal-state UX
export { default as InStoreDoneButton } from './InStoreDoneButton';
export { default as StartFreshAction } from './StartFreshAction';
export { default as MergeSuggestionBanner } from './MergeSuggestionBanner';
export type { MergeSuggestion } from './MergeSuggestionBanner';
