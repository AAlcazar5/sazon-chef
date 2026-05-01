// frontend/components/meal-plan/SurpriseBadge.tsx
// Disabled — the "New for you" pill has been retired in favor of a cleaner card.

import React from 'react';

interface SurpriseBadgeProps {
  recipeId: string | null | undefined;
  cookedRecipeIds: Set<string>;
  isDark: boolean;
}

export default function SurpriseBadge(_props: SurpriseBadgeProps) {
  return null;
}
