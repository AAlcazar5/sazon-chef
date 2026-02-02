// frontend/components/home/HomeLoadingState.tsx
// Loading state with skeleton loaders for home screen

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedLogoMascot } from '../mascot';
import RecipeCardSkeleton from '../recipe/RecipeCardSkeleton';
import { Spacing } from '../../constants/Spacing';

interface HomeLoadingStateProps {
  viewMode: 'grid' | 'list';
}

function HomeLoadingState({ viewMode }: HomeLoadingStateProps) {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <AnimatedLogoMascot
              expression="happy"
              size="xsmall"
              animationType="pulse"
            />
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" style={{ marginLeft: -2 }} accessibilityRole="header">Sazon Chef</Text>
          </View>
          {/* View Mode Toggle Skeleton */}
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <View className="w-10 h-8 rounded bg-gray-200 dark:bg-gray-600" />
            <View className="w-10 h-8 rounded bg-gray-200 dark:bg-gray-600 ml-1" />
          </View>
        </View>
      </View>
      {/* Quick Filter Chips Skeleton */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row" style={{ gap: 8 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} className="h-9 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
          ))}
        </View>
      </View>

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
    </SafeAreaView>
  );
}

export default HomeLoadingState;
