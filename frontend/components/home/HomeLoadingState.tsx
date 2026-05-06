// frontend/components/home/HomeLoadingState.tsx
// ROADMAP 4.0 FX1.2 — body-only loading state.
//
// The persistent home chrome (HomeHeader + FilterRow) lives in app/(tabs)/index.tsx
// and stays visible across all states. This component renders ONLY the body —
// hero skeleton + suggestions skeleton — to slot under the chrome.

import React from 'react';
import { View, ScrollView } from 'react-native';
import RecipeCardSkeleton from '../recipe/RecipeCardSkeleton';
import { Spacing } from '../../constants/Spacing';

interface HomeLoadingStateProps {
  viewMode: 'grid' | 'list';
}

function HomeLoadingState({ viewMode }: HomeLoadingStateProps) {
  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}>
      {/* Featured Recipe Skeleton */}
      <View className="px-4 mb-4" style={{ marginTop: Spacing.xl }}>
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <View className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
            <View className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </View>
          <View className="h-9 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </View>
        <RecipeCardSkeleton variant="featured" />
      </View>

      {/* More Suggestions Skeleton */}
      <View className="px-4">
        <View className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
        {viewMode === 'grid' ? (
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -Spacing.sm }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={{ width: '50%', paddingHorizontal: Spacing.sm, marginBottom: Spacing.md }}>
                <RecipeCardSkeleton variant="grid" />
              </View>
            ))}
          </View>
        ) : (
          <>
            {[1, 2, 3].map((i) => (
              <RecipeCardSkeleton key={i} variant="list" />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

export default HomeLoadingState;
