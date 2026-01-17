import React from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import SkeletonLoader from '../ui/SkeletonLoader';

export default function WeeklyCalendarSkeleton() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="px-4 mb-4">
      {/* Header skeleton */}
      <View className="flex-row items-center justify-between mb-3">
        <SkeletonLoader width={120} height={20} borderRadius={4} />
        <View className="flex-row space-x-2">
          <SkeletonLoader width={24} height={24} borderRadius={12} />
          <SkeletonLoader width={24} height={24} borderRadius={12} />
        </View>
      </View>
      
      {/* Calendar days skeleton */}
      <View className="flex-row justify-between">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <View
            key={day}
            className="items-center"
            style={{ width: `${100 / 7}%` }}
          >
            <SkeletonLoader 
              width={40} 
              height={40} 
              borderRadius={20}
              style={{ marginBottom: 4 }}
            />
            <SkeletonLoader width={30} height={12} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

