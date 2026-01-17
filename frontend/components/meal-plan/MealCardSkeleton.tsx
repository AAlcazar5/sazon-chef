import React from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import SkeletonLoader from '../ui/SkeletonLoader';

export default function MealCardSkeleton() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View 
      className="rounded-lg p-4 mb-3 border"
      style={{
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderColor: isDark ? '#374151' : '#E5E7EB',
      }}
    >
      {/* Image skeleton */}
      <SkeletonLoader 
        width="100%" 
        height={120} 
        borderRadius={8} 
        style={{ marginBottom: 12 }}
      />
      
      {/* Title and switch skeleton */}
      <View className="flex-row items-center justify-between mb-3">
        <SkeletonLoader width="60%" height={20} borderRadius={4} />
        <SkeletonLoader width={48} height={28} borderRadius={14} />
      </View>
      
      {/* Calories and time skeleton */}
      <View className="flex-row items-center space-x-3 mb-3">
        <SkeletonLoader width={80} height={16} borderRadius={4} />
        <SkeletonLoader width={60} height={16} borderRadius={4} />
      </View>
      
      {/* Macro breakdown skeleton */}
      <View 
        className="rounded-lg p-3 mb-3"
        style={{ backgroundColor: isDark ? '#111827' : '#F9FAFB' }}
      >
        <SkeletonLoader width="40%" height={14} borderRadius={4} style={{ marginBottom: 8 }} />
        <View className="flex-row justify-between">
          <SkeletonLoader width={50} height={20} borderRadius={10} />
          <SkeletonLoader width={50} height={20} borderRadius={10} />
          <SkeletonLoader width={50} height={20} borderRadius={10} />
        </View>
      </View>
      
      {/* Additional info skeleton */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-3">
          <SkeletonLoader width={60} height={14} borderRadius={4} />
          <SkeletonLoader width={50} height={14} borderRadius={4} />
        </View>
        <SkeletonLoader width={100} height={14} borderRadius={4} />
      </View>
    </View>
  );
}

