import React from 'react';
import { View } from 'react-native';
import SkeletonLoader from '../ui/SkeletonLoader';
import { useColorScheme } from 'nativewind';

interface RecipeCardSkeletonProps {
  variant?: 'list' | 'grid' | 'featured';
}

export default function RecipeCardSkeleton({ variant = 'list' }: RecipeCardSkeletonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (variant === 'featured') {
    return (
      <View className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg mb-4" style={{ borderWidth: 2, borderColor: isDark ? '#4B5563' : '#E5E7EB' }}>
        {/* Hero Image Skeleton */}
        <SkeletonLoader width="100%" height={180} borderRadius={0} />

        <View className="p-4">
          {/* Title */}
          <SkeletonLoader width="85%" height={24} borderRadius={4} style={{ marginBottom: 10 }} />

          {/* Badges Row */}
          <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
            <SkeletonLoader width={60} height={24} borderRadius={12} />
            <SkeletonLoader width={50} height={24} borderRadius={12} />
            <SkeletonLoader width={70} height={24} borderRadius={12} />
          </View>

          {/* Macro Nutrients - 4 Column */}
          <View className="flex-row items-center justify-between mb-3 p-2 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
            <SkeletonLoader width={50} height={14} borderRadius={4} />
            <SkeletonLoader width={50} height={14} borderRadius={4} />
            <SkeletonLoader width={50} height={14} borderRadius={4} />
            <SkeletonLoader width={50} height={14} borderRadius={4} />
          </View>

          {/* Description */}
          <SkeletonLoader width="100%" height={16} borderRadius={4} style={{ marginBottom: 4 }} />
          <SkeletonLoader width="80%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />

          {/* Action Buttons */}
          <View className="flex-row justify-between items-center">
            <SkeletonLoader width={36} height={36} borderRadius={18} />
            <View className="flex-row" style={{ gap: 8 }}>
              <SkeletonLoader width={36} height={36} borderRadius={18} />
              <SkeletonLoader width={36} height={36} borderRadius={18} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'grid') {
    return (
      <View className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm" style={{ borderWidth: 2, borderColor: isDark ? '#4B5563' : '#E5E7EB', height: 280 }}>
        {/* Image Skeleton */}
        <SkeletonLoader width="100%" height={110} borderRadius={0} />

        <View className="p-3">
          {/* Title */}
          <SkeletonLoader width="80%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />

          {/* Badges */}
          <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
            <SkeletonLoader width={50} height={20} borderRadius={10} />
            <SkeletonLoader width={60} height={20} borderRadius={10} />
          </View>

          {/* Macros - 4 Column */}
          <View className="flex-row items-center justify-between py-1.5 px-2 rounded-lg mb-2" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
            <SkeletonLoader width={35} height={12} borderRadius={3} />
            <SkeletonLoader width={35} height={12} borderRadius={3} />
            <SkeletonLoader width={35} height={12} borderRadius={3} />
            <SkeletonLoader width={35} height={12} borderRadius={3} />
          </View>

          {/* Action Buttons */}
          <View className="flex-row justify-between items-center mt-1">
            <SkeletonLoader width={28} height={28} borderRadius={14} />
            <View className="flex-row" style={{ gap: 6 }}>
              <SkeletonLoader width={28} height={28} borderRadius={14} />
              <SkeletonLoader width={28} height={28} borderRadius={14} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // List view (default)
  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm" style={{ borderWidth: 2, borderColor: isDark ? '#4B5563' : '#E5E7EB', height: 290 }}>
      {/* Image Skeleton */}
      <SkeletonLoader width="100%" height={130} borderRadius={0} />

      <View className="p-3">
        {/* Title */}
        <SkeletonLoader width="75%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />

        {/* Badges Row */}
        <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
          <SkeletonLoader width={55} height={20} borderRadius={10} />
          <SkeletonLoader width={65} height={20} borderRadius={10} />
          <SkeletonLoader width={50} height={20} borderRadius={10} />
        </View>

        {/* Macro Nutrients - 4 Column */}
        <View className="flex-row items-center justify-between py-1.5 px-2 rounded-lg mb-2" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
          <SkeletonLoader width={40} height={12} borderRadius={3} />
          <SkeletonLoader width={40} height={12} borderRadius={3} />
          <SkeletonLoader width={40} height={12} borderRadius={3} />
          <SkeletonLoader width={40} height={12} borderRadius={3} />
        </View>

        {/* Action Buttons */}
        <View className="flex-row justify-between items-center mt-1">
          <SkeletonLoader width={28} height={28} borderRadius={14} />
          <View className="flex-row" style={{ gap: 6 }}>
            <SkeletonLoader width={28} height={28} borderRadius={14} />
            <SkeletonLoader width={28} height={28} borderRadius={14} />
          </View>
        </View>
      </View>
    </View>
  );
}
