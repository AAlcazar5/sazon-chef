// frontend/components/cookbook/CollectionFilterRow.tsx
// Inline horizontal animated chip row for filtering recipes by collection.
// Replaces the modal-based collection picker for the primary selection flow.

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import type { Collection } from '../../types';

interface CollectionChipProps {
  label: string;
  count?: number;
  isSelected: boolean;
  isDark: boolean;
  onPress: () => void;
}

function CollectionChip({ label, count, isSelected, isDark, onPress }: CollectionChipProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 10, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  return (
    <Animated.View style={animStyle}>
      <HapticTouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hapticStyle="light"
        style={{ borderRadius: 20, overflow: 'hidden' }}
      >
        {isSelected ? (
          <LinearGradient
            colors={['#fa7e12', '#f59e0b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 7, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{label}</Text>
            {count !== undefined && (
              <View style={{
                marginLeft: 6, backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
              }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{count}</Text>
              </View>
            )}
          </LinearGradient>
        ) : (
          <View style={{
            paddingVertical: 7, paddingHorizontal: 14,
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            borderRadius: 20,
          }}>
            <Text style={{ color: isDark ? '#D1D5DB' : '#374151', fontSize: 13, fontWeight: '600' }}>{label}</Text>
            {count !== undefined && (
              <View style={{
                marginLeft: 6,
                backgroundColor: isDark ? '#4B5563' : '#E5E7EB',
                borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
              }}>
                <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 11, fontWeight: '700' }}>{count}</Text>
              </View>
            )}
          </View>
        )}
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

interface CollectionFilterRowProps {
  collections: Collection[];
  selectedListId: string | null;
  onSelectList: (id: string | null) => void;
  isDark: boolean;
  totalSavedCount?: number;
}

export default function CollectionFilterRow({
  collections,
  selectedListId,
  onSelectList,
  isDark,
  totalSavedCount,
}: CollectionFilterRowProps) {
  if (collections.length === 0) return null;

  return (
    <View style={{
      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
    }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' }}
      >
        <CollectionChip
          label="All"
          count={totalSavedCount}
          isSelected={selectedListId === null}
          isDark={isDark}
          onPress={() => onSelectList(null)}
        />
        {collections.map((collection) => (
          <CollectionChip
            key={collection.id}
            label={collection.name}
            count={collection.recipeCount ?? undefined}
            isSelected={selectedListId === collection.id}
            isDark={isDark}
            onPress={() => onSelectList(collection.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
