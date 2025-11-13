import React from 'react';
import { View } from 'react-native';
import SkeletonLoader from '../ui/SkeletonLoader';

export default function RecipeCardSkeleton() {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Title skeleton */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-2">
          <SkeletonLoader width="70%" height={24} borderRadius={6} />
          <SkeletonLoader width="50%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
      </View>

      {/* Description skeleton */}
      <SkeletonLoader width="100%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="90%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="75%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />

      {/* Meta information skeleton */}
      <View className="flex-row items-center space-x-3 mb-3">
        <SkeletonLoader width={80} height={20} borderRadius={10} />
        <SkeletonLoader width={60} height={20} borderRadius={10} />
        <SkeletonLoader width={70} height={20} borderRadius={10} />
      </View>

      {/* Macros skeleton */}
      <View className="flex-row space-x-2">
        <SkeletonLoader width={60} height={24} borderRadius={12} />
        <SkeletonLoader width={70} height={24} borderRadius={12} />
        <SkeletonLoader width={65} height={24} borderRadius={12} />
        <SkeletonLoader width={70} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

